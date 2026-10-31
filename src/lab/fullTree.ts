import type { Board, Player, TreeNode } from '../types';
import { checkWinner } from '../minimax';

/**
 * The complete (unpruned) game tree of a small position with exact minimax values.
 * Used only by the Learn page to *draw* pruned branches that the real alpha-beta tree
 * (which never creates them) does not contain. Values use the same scoring and
 * move order as the engine: +1 AI (O) win, −1 human (X) win, 0 otherwise; cells 0 → 8.
 */
export interface FullNode {
  /** Move path from the root, e.g. "58" = cell 5 then cell 8. Unique per node. */
  key: string;
  move: number | null;
  board: Board;
  depth: number;
  isMax: boolean;
  /** Exact minimax value. */
  value: number;
  /** Index into `children` of the chosen child (-1 for terminal nodes). */
  bestIndex: number;
  terminal: boolean;
  children: FullNode[];
}

export function buildFullTree(board: Board, aiPlayer: Player = 'O'): FullNode {
  const human: Player = aiPlayer === 'X' ? 'O' : 'X';

  function build(b: Board, move: number | null, depth: number, isMax: boolean, key: string): FullNode {
    const winner = checkWinner(b);
    const node: FullNode = {
      key,
      move,
      board: b,
      depth,
      isMax,
      value: 0,
      bestIndex: -1,
      terminal: winner !== null,
      children: [],
    };
    if (winner !== null) {
      node.value = winner === aiPlayer ? 1 : winner === human ? -1 : 0;
      return node;
    }
    const player = isMax ? aiPlayer : human;
    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== null) continue;
      const next = [...b] as Board;
      next[i] = player;
      const child = build(next, i, depth + 1, !isMax, key + i);
      node.children.push(child);
      if (isMax ? child.value > best : child.value < best) {
        best = child.value;
        node.bestIndex = node.children.length - 1;
      }
    }
    node.value = best;
    return node;
  }

  return build([...board] as Board, null, 0, true, '');
}

export function countNodes(n: FullNode): number {
  return 1 + n.children.reduce((s, c) => s + countNodes(c), 0);
}

export function maxDepthOf(n: FullNode): number {
  return n.children.reduce((m, c) => Math.max(m, maxDepthOf(c)), n.depth);
}

/** Map move-path key → real alpha-beta TreeNode, so the two trees can be overlaid. */
export function keyRealTree(root: TreeNode): { byKey: Map<string, TreeNode>; keyById: Map<number, string> } {
  const byKey = new Map<string, TreeNode>();
  const keyById = new Map<number, string>();
  const walk = (n: TreeNode, key: string) => {
    byKey.set(key, n);
    keyById.set(n.id, key);
    n.children.forEach((c) => walk(c, key + c.move));
  };
  walk(root, '');
  return { byKey, keyById };
}

export interface LaidOutNode {
  node: FullNode;
  x: number;
  y: number;
  parent: number; // index of the parent in the layout array, -1 for the root
}

export interface TreeLayout {
  items: LaidOutNode[];
  width: number;
  height: number;
}

/** Simple tidy layout: leaves are spaced evenly, parents are centred over their children. */
export function layoutTree(root: FullNode, dx = 30, dy = 62, pad = 22): TreeLayout {
  const items: LaidOutNode[] = [];
  let nextLeaf = 0;
  let maxDepth = 0;

  function place(n: FullNode, parent: number): number {
    const index = items.length;
    items.push({ node: n, x: 0, y: n.depth * dy + pad, parent });
    if (n.depth > maxDepth) maxDepth = n.depth;
    if (n.children.length === 0) {
      items[index].x = pad + nextLeaf * dx;
      nextLeaf++;
    } else {
      const kids = n.children.map((c) => place(c, index));
      items[index].x = (items[kids[0]].x + items[kids[kids.length - 1]].x) / 2;
    }
    return index;
  }
  place(root, -1);

  return {
    items,
    width: pad * 2 + Math.max(0, nextLeaf - 1) * dx,
    height: pad * 2 + maxDepth * dy,
  };
}
