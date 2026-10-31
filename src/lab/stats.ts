import type { Board, ExplorationStep, TreeNode } from '../types';

/** Live search statistics, all derived from the real `steps` array and tree. */
export interface SearchStats {
  /** Nodes visited (one `visit` step each). */
  explored: number;
  /** Nodes scored as terminal: a win/draw, or the depth limit (`score` steps with isTerminal). */
  terminal: number;
  /** Child branches never expanded because an alpha-beta cutoff fired. */
  pruned: number;
  /** Deepest node visited so far. */
  maxDepth: number;
}

export const EMPTY_STATS: SearchStats = { explored: 0, terminal: 0, pruned: 0, maxDepth: 0 };

export function emptyCells(board: Board): number {
  let n = 0;
  for (const c of board) if (c === null) n++;
  return n;
}

export function indexNodes(tree: TreeNode): Map<number, TreeNode> {
  const map = new Map<number, TreeNode>();
  const walk = (n: TreeNode) => {
    map.set(n.id, n);
    n.children.forEach(walk);
  };
  walk(tree);
  return map;
}

/**
 * How many child branches a node skipped when it cut off.
 * A `prune` step fires after *any* child, including the last one, so the number of
 * skipped branches is (empty cells) − (children actually expanded), which may be 0.
 */
export function skippedBranches(node: TreeNode): number {
  return Math.max(0, emptyCells(node.board) - node.children.length);
}

/** Cumulative statistics for every step index, so lookups during playback are O(1). */
export interface StatsIndex {
  explored: Uint32Array;
  terminal: Uint32Array;
  pruned: Uint32Array;
  maxDepth: Uint16Array;
  length: number;
}

export function buildStatsIndex(tree: TreeNode, steps: ExplorationStep[]): StatsIndex {
  const nodes = indexNodes(tree);
  const n = steps.length;
  const explored = new Uint32Array(n);
  const terminal = new Uint32Array(n);
  const pruned = new Uint32Array(n);
  const maxDepth = new Uint16Array(n);
  let e = 0;
  let t = 0;
  let p = 0;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const s = steps[i];
    if (s.type === 'visit') {
      e++;
      if (s.depth > d) d = s.depth;
    } else if (s.type === 'score' && s.isTerminal) {
      t++;
    } else if (s.type === 'prune') {
      const node = nodes.get(s.nodeId);
      if (node) p += skippedBranches(node);
    }
    explored[i] = e;
    terminal[i] = t;
    pruned[i] = p;
    maxDepth[i] = d;
  }
  return { explored, terminal, pruned, maxDepth, length: n };
}

/** Statistics after executing steps[0..index] (index −1 → nothing executed yet). */
export function statsAt(index: StatsIndex, i: number): SearchStats {
  if (index.length === 0 || i < 0) return EMPTY_STATS;
  const k = Math.min(i, index.length - 1);
  return {
    explored: index.explored[k],
    terminal: index.terminal[k],
    pruned: index.pruned[k],
    maxDepth: index.maxDepth[k],
  };
}
