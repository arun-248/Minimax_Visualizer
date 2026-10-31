import { create } from 'zustand';
import type { Board, GameState, TreeNode, ExplorationStep, VizMode } from './types';
import { buildMinimaxTree, checkWinner } from './minimax';

function createInitialBoard(): Board {
  return Array(9).fill(null) as Board;
}

function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'X',
    winner: null,
    gameOver: false,
  };
}

interface AppStore {
  // Game state
  game: GameState;
  lastMove: number | null;

  // Visualization state
  tree: TreeNode | null;
  treeKey: number;
  steps: ExplorationStep[];
  currentStepIndex: number;
  visitedNodeIds: Set<number>;
  scoredNodeIds: Set<number>;
  bestPathNodeIds: Set<number>;
  mode: VizMode;
  speed: number;
  bestMove: number | null;
  depthLimit: number | null;
  /** Wall-clock time (ms) the last buildMinimaxTree call took, or null if no search yet. */
  searchTimeMs: number | null;

  // Actions
  /** Jump to any step (-1 = before the first step). Rebuilds visited/scored sets from the steps. */
  vizSeek: (index: number) => void;
  /** Load a position with the AI (O) to move and start its search. Used by demos. */
  loadPosition: (board: Board) => void;
  humanMove: (cell: number) => void;
  aiThink: () => void;
  vizStep: () => void;
  vizPlay: () => void;
  vizPause: () => void;
  vizFinish: () => void;
  aiMoveInstant: () => void;
  aiMove: () => void;
  setSpeed: (speed: number) => void;
  setDepthLimit: (limit: number | null) => void;
  resetGame: () => void;
}

function computeBestPath(tree: TreeNode): Set<number> {
  const path = new Set<number>();
  let current: TreeNode | undefined = tree;
  while (current) {
    path.add(current.id);
    if (current.bestChildId === null) break;
    current = current.children.find((c) => c.id === current!.bestChildId);
  }
  return path;
}

function getAllNodeIds(tree: TreeNode): { visited: Set<number>; scored: Set<number> } {
  const visited = new Set<number>();
  const scored = new Set<number>();
  function walk(node: TreeNode) {
    visited.add(node.id);
    if (node.score !== null) scored.add(node.id);
    for (const child of node.children) walk(child);
  }
  walk(tree);
  return { visited, scored };
}

export const useStore = create<AppStore>((set, get) => ({
  game: createInitialGameState(),
  lastMove: null,

  tree: null,
  treeKey: 0,
  steps: [],
  currentStepIndex: -1,
  visitedNodeIds: new Set(),
  scoredNodeIds: new Set(),
  bestPathNodeIds: new Set(),
  mode: 'idle',
  speed: 200,
  bestMove: null,
  depthLimit: 3,
  searchTimeMs: null,

  vizSeek: (index: number) => {
    const { steps, tree } = get();
    if (!tree || steps.length === 0) return;
    const target = Math.max(-1, Math.min(index, steps.length - 1));
    const visited = new Set<number>();
    const scored = new Set<number>();
    // Same rules as vizStep, replayed from the start up to (and including) `target`.
    for (let i = 0; i <= target; i++) {
      const step = steps[i];
      if (step.type === 'visit') visited.add(step.nodeId);
      if (step.type === 'score') {
        visited.add(step.nodeId);
        scored.add(step.nodeId);
      }
      if (step.type === 'backpropagate') visited.add(step.nodeId);
    }
    const finished = target >= steps.length - 1;
    set({
      currentStepIndex: target,
      visitedNodeIds: visited,
      scoredNodeIds: scored,
      // The best path is only known once the search is complete (as in vizStep).
      bestPathNodeIds: finished ? computeBestPath(tree) : new Set(),
      mode: finished ? 'done' : 'stepping',
    });
  },

  loadPosition: (board: Board) => {
    set({
      game: {
        board: [...board],
        currentPlayer: 'O',
        winner: null,
        gameOver: false,
      },
      lastMove: null,
      tree: null,
      treeKey: 0,
      steps: [],
      currentStepIndex: -1,
      visitedNodeIds: new Set(),
      scoredNodeIds: new Set(),
      bestPathNodeIds: new Set(),
      mode: 'idle',
      bestMove: null,
      searchTimeMs: null,
    });
    get().aiThink();
  },

  humanMove: (cell: number) => {
    const { game } = get();
    if (game.gameOver || game.currentPlayer !== 'X' || game.board[cell] !== null) return;

    const newBoard = [...game.board];
    newBoard[cell] = 'X';
    const winner = checkWinner(newBoard);

    set({
      game: {
        board: newBoard,
        currentPlayer: 'O',
        winner,
        gameOver: winner !== null,
      },
      lastMove: cell,
      // Clear previous visualization
      tree: null,
      treeKey: 0,
      steps: [],
      currentStepIndex: -1,
      visitedNodeIds: new Set(),
      scoredNodeIds: new Set(),
      bestPathNodeIds: new Set(),
      mode: 'idle',
      bestMove: null,
      searchTimeMs: null,
    });
  },

  aiThink: () => {
    const { game, depthLimit } = get();
    if (game.gameOver || game.currentPlayer !== 'O') return;

    const t0 = performance.now();
    const result = buildMinimaxTree(game.board, 'O', depthLimit);
    const searchTimeMs = performance.now() - t0;

    set((s) => ({
      searchTimeMs,
      tree: result.tree,
      treeKey: s.treeKey + 1,
      steps: result.steps,
      currentStepIndex: -1,
      visitedNodeIds: new Set(),
      scoredNodeIds: new Set(),
      bestPathNodeIds: new Set(),
      mode: 'playing',
      bestMove: result.bestMove,
    }));
  },

  vizStep: () => {
    const { steps, currentStepIndex, visitedNodeIds, scoredNodeIds, tree } = get();
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      // Done
      if (tree) {
        const bestPath = computeBestPath(tree);
        const all = getAllNodeIds(tree);
        set({
          mode: 'done',
          currentStepIndex: nextIndex,
          visitedNodeIds: all.visited,
          scoredNodeIds: all.scored,
          bestPathNodeIds: bestPath,
        });
      }
      return;
    }

    const step = steps[nextIndex];
    const newVisited = new Set(visitedNodeIds);
    const newScored = new Set(scoredNodeIds);

    if (step.type === 'visit') newVisited.add(step.nodeId);
    if (step.type === 'score') {
      newVisited.add(step.nodeId);
      newScored.add(step.nodeId);
    }
    if (step.type === 'backpropagate') newVisited.add(step.nodeId);

    set({
      currentStepIndex: nextIndex,
      visitedNodeIds: newVisited,
      scoredNodeIds: newScored,
    });

    // Check if this was the last step
    if (nextIndex >= steps.length - 1 && tree) {
      const bestPath = computeBestPath(tree);
      set({ mode: 'done', bestPathNodeIds: bestPath });
    }
  },

  vizPlay: () => set({ mode: 'playing' }),
  vizPause: () => set({ mode: 'stepping' }),

  vizFinish: () => {
    const { tree, steps } = get();
    if (!tree) return;
    const bestPath = computeBestPath(tree);
    const all = getAllNodeIds(tree);
    set({
      mode: 'done',
      currentStepIndex: steps.length - 1,
      visitedNodeIds: all.visited,
      scoredNodeIds: all.scored,
      bestPathNodeIds: bestPath,
    });
  },

  aiMoveInstant: () => {
    const { game } = get();
    if (game.gameOver || game.currentPlayer !== 'O') return;

    const { bestMove } = buildMinimaxTree(game.board, 'O', null);
    if (bestMove < 0) return;

    const newBoard = [...game.board];
    newBoard[bestMove] = 'O';
    const winner = checkWinner(newBoard);

    set({
      game: {
        board: newBoard,
        currentPlayer: 'X',
        winner,
        gameOver: winner !== null,
      },
      lastMove: bestMove,
    });
  },

  aiMove: () => {
    const { game, bestMove } = get();
    if (game.gameOver || bestMove === null || bestMove < 0) return;

    const newBoard = [...game.board];
    newBoard[bestMove] = 'O';
    const winner = checkWinner(newBoard);

    set({
      game: {
        board: newBoard,
        currentPlayer: 'X',
        winner,
        gameOver: winner !== null,
      },
      lastMove: bestMove,
      mode: 'idle',
      bestMove: null,
    });
  },

  setSpeed: (speed: number) => set({ speed }),
  setDepthLimit: (limit: number | null) => set({ depthLimit: limit }),

  resetGame: () =>
    set({
      game: createInitialGameState(),
      lastMove: null,
      tree: null,
      treeKey: 0,
      steps: [],
      currentStepIndex: -1,
      visitedNodeIds: new Set(),
      scoredNodeIds: new Set(),
      bestPathNodeIds: new Set(),
      mode: 'idle',
      speed: get().speed,
      bestMove: null,
      searchTimeMs: null,
    }),
}));
