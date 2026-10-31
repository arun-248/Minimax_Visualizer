export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = CellValue[];

export interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  gameOver: boolean;
}

export interface TreeNode {
  id: number;
  board: Board;
  move: number | null;
  depth: number;
  isMaximizing: boolean;
  score: number | null;
  children: TreeNode[];
  isTerminal: boolean;
  bestChildId: number | null;
  pruned: boolean;
}

export type StepType = 'visit' | 'score' | 'backpropagate' | 'prune';

export interface ExplorationStep {
  type: StepType;
  nodeId: number;
  score: number | null;
  alpha: number;
  beta: number;
  depth: number;
  isMaximizing: boolean;
  isTerminal?: boolean;
}

export type VizMode = 'idle' | 'stepping' | 'playing' | 'done';

export interface VisualizationState {
  tree: TreeNode | null;
  steps: ExplorationStep[];
  currentStepIndex: number;
  visitedNodeIds: Set<number>;
  scoredNodeIds: Set<number>;
  bestPathNodeIds: Set<number>;
  mode: VizMode;
  speed: number;
  bestMove: number | null;
}
