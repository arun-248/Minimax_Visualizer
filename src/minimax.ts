import type { Board, Player, TreeNode, ExplorationStep } from './types';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: Board): Player | 'draw' | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}

export function getWinningCells(board: Board): number[] {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [a, b, c];
    }
  }
  return [];
}

interface MinimaxResult {
  tree: TreeNode;
  steps: ExplorationStep[];
  bestMove: number;
}

let nodeIdCounter = 0;

function createNode(
  board: Board,
  move: number | null,
  depth: number,
  isMaximizing: boolean,
): TreeNode {
  return {
    id: nodeIdCounter++,
    board: [...board],
    move,
    depth,
    isMaximizing,
    score: null,
    children: [],
    isTerminal: false,
    bestChildId: null,
    pruned: false,
  };
}

function explore(
  node: TreeNode,
  aiPlayer: Player,
  humanPlayer: Player,
  alpha: number,
  beta: number,
  steps: ExplorationStep[],
  maxDepth: number | null,
): number {
  const stepBase = { depth: node.depth, isMaximizing: node.isMaximizing };
  steps.push({ type: 'visit', nodeId: node.id, score: null, alpha, beta, ...stepBase });

  const winner = checkWinner(node.board);
  const atDepthLimit = maxDepth !== null && node.depth >= maxDepth;

  if (winner !== null || atDepthLimit) {
    node.isTerminal = true;
    let score = 0;
    if (winner === aiPlayer) score = 1;
    else if (winner === humanPlayer) score = -1;
    node.score = score;
    steps.push({ type: 'score', nodeId: node.id, score, alpha, beta, ...stepBase, isTerminal: true });
    return score;
  }

  const currentPlayer = node.isMaximizing ? aiPlayer : humanPlayer;
  let bestScore = node.isMaximizing ? -Infinity : Infinity;
  let bestChildId: number | null = null;
  let a = alpha;
  let b = beta;

  for (let i = 0; i < 9; i++) {
    if (node.board[i] !== null) continue;

    const newBoard = [...node.board];
    newBoard[i] = currentPlayer;
    const child = createNode(newBoard, i, node.depth + 1, !node.isMaximizing);
    node.children.push(child);

    const childScore = explore(child, aiPlayer, humanPlayer, a, b, steps, maxDepth);
    steps.push({ type: 'backpropagate', nodeId: node.id, score: childScore, alpha: a, beta: b, ...stepBase });

    if (node.isMaximizing) {
      if (childScore > bestScore) {
        bestScore = childScore;
        bestChildId = child.id;
      }
      a = Math.max(a, bestScore);
    } else {
      if (childScore < bestScore) {
        bestScore = childScore;
        bestChildId = child.id;
      }
      b = Math.min(b, bestScore);
    }

    if (b <= a) {
      steps.push({ type: 'prune', nodeId: node.id, score: null, alpha: a, beta: b, ...stepBase });
      // Mark remaining empty cells as pruned (not explored)
      node.pruned = true;
      break;
    }
  }

  node.score = bestScore;
  node.bestChildId = bestChildId;
  steps.push({ type: 'score', nodeId: node.id, score: bestScore, alpha: a, beta: b, ...stepBase });
  return bestScore;
}

export function buildMinimaxTree(
  board: Board,
  aiPlayer: Player,
  depthLimit: number | null,
): MinimaxResult {
  nodeIdCounter = 0;
  const humanPlayer: Player = aiPlayer === 'X' ? 'O' : 'X';
  const steps: ExplorationStep[] = [];

  // AI is always maximizing at the root
  const root = createNode(board, null, 0, true);
  explore(root, aiPlayer, humanPlayer, -Infinity, Infinity, steps, depthLimit);

  // Find the best move from root's children
  let bestMove = -1;
  if (root.bestChildId !== null) {
    const bestChild = root.children.find((c) => c.id === root.bestChildId);
    if (bestChild && bestChild.move !== null) {
      bestMove = bestChild.move;
    }
  }

  return { tree: root, steps, bestMove };
}

export function getBestMove(board: Board, aiPlayer: Player): number {
  const { bestMove } = buildMinimaxTree(board, aiPlayer, null);
  return bestMove;
}
