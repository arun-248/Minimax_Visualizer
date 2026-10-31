import type { Board, Player } from '../types';
import { buildMinimaxTree, checkWinner } from '../minimax';
import { emptyCells, skippedBranches } from './stats';

/**
 * Counting search engines for the "Compare Algorithms" page.
 *
 * `minimax.ts` is left untouched. These two functions are a plain-Minimax and an
 * Alpha-Beta implementation of the *same* search the app uses, written to count work:
 *   - same move ordering (cells 0 → 8)
 *   - same terminal test (winner, or depth limit) and the same scores (+1 AI win, −1 human win, 0 otherwise)
 *   - same tie-breaking (strict > / <, so the first best move in cell order wins)
 *   - same cutoff test (β ≤ α, checked after every child)
 * `verifyAgainstEngine` proves that on every run by comparing with `buildMinimaxTree`.
 */

export interface SearchCounts {
  bestMove: number;
  score: number;
  /** Nodes visited (one per call of explore). */
  nodes: number;
  /** Nodes scored directly: a win/loss/draw, or the depth limit. */
  terminal: number;
  /** Child branches never expanded because of a cutoff. 0 for plain Minimax. */
  pruned: number;
  /** Number of cutoff events (β ≤ α). */
  cutoffs: number;
  maxDepth: number;
  /** Nodes visited at each depth (index = depth). */
  perDepth: number[];
}

export interface SearchResult extends SearchCounts {
  /** Mean wall-clock time of one search, in ms. */
  timeMs: number;
  /** How many timed repetitions the mean is over. */
  reps: number;
}

export function countSearch(
  board: Board,
  aiPlayer: Player,
  depthLimit: number | null,
  pruning: boolean,
): SearchCounts {
  const human: Player = aiPlayer === 'X' ? 'O' : 'X';
  const counts = {
    nodes: 0,
    terminal: 0,
    pruned: 0,
    cutoffs: 0,
    maxDepth: 0,
    perDepth: [] as number[],
  };
  let rootMove = -1;

  function explore(b: Board, depth: number, isMax: boolean, alpha: number, beta: number): number {
    counts.nodes++;
    if (depth > counts.maxDepth) counts.maxDepth = depth;
    counts.perDepth[depth] = (counts.perDepth[depth] ?? 0) + 1;

    const winner = checkWinner(b);
    if (winner !== null || (depthLimit !== null && depth >= depthLimit)) {
      counts.terminal++;
      return winner === aiPlayer ? 1 : winner === human ? -1 : 0;
    }

    const player = isMax ? aiPlayer : human;
    const empties = emptyCells(b);
    let best = isMax ? -Infinity : Infinity;
    let a = alpha;
    let bt = beta;
    let tried = 0;

    for (let i = 0; i < 9; i++) {
      if (b[i] !== null) continue;
      const next = [...b] as Board;
      next[i] = player;
      const s = explore(next, depth + 1, !isMax, a, bt);
      tried++;

      if (isMax) {
        if (s > best) {
          best = s;
          if (depth === 0) rootMove = i;
        }
        if (pruning) a = Math.max(a, best);
      } else {
        if (s < best) {
          best = s;
          if (depth === 0) rootMove = i;
        }
        if (pruning) bt = Math.min(bt, best);
      }

      if (pruning && bt <= a) {
        counts.cutoffs++;
        counts.pruned += empties - tried;
        break;
      }
    }
    return best;
  }

  // The AI is always MAX at the root, as in buildMinimaxTree.
  const score = explore(board, 0, true, -Infinity, Infinity);
  return { ...counts, bestMove: rootMove, score };
}

/** Counts once, then times repeated runs so sub-millisecond searches still give a stable mean. */
export function timedSearch(
  board: Board,
  aiPlayer: Player,
  depthLimit: number | null,
  pruning: boolean,
  budgetMs = 80,
): SearchResult {
  countSearch(board, aiPlayer, depthLimit, pruning); // warm-up (JIT), not timed
  const counts = countSearch(board, aiPlayer, depthLimit, pruning);

  const probeStart = performance.now();
  countSearch(board, aiPlayer, depthLimit, pruning);
  const probe = Math.max(performance.now() - probeStart, 0.001);
  const reps = Math.max(1, Math.min(400, Math.floor(budgetMs / probe)));

  const t0 = performance.now();
  for (let r = 0; r < reps; r++) countSearch(board, aiPlayer, depthLimit, pruning);
  const timeMs = (performance.now() - t0) / reps;

  return { ...counts, timeMs, reps };
}

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Cross-checks both counting engines against the app's real `buildMinimaxTree`.
 * If anything disagrees, the Compare page shows a warning instead of hiding it.
 */
export function verifyAgainstEngine(
  board: Board,
  aiPlayer: Player,
  depthLimit: number | null,
  mm: SearchCounts,
  ab: SearchCounts,
): Check[] {
  const real = buildMinimaxTree(board, aiPlayer, depthLimit);
  let nodes = 0;
  let terminal = 0;
  let pruned = 0;
  let maxDepth = 0;
  const walk = (n: typeof real.tree) => {
    nodes++;
    if (n.isTerminal) terminal++;
    if (n.pruned) pruned += skippedBranches(n);
    if (n.depth > maxDepth) maxDepth = n.depth;
    n.children.forEach(walk);
  };
  walk(real.tree);
  const realScore = real.tree.score ?? 0;

  const checks: Check[] = [];
  const add = (label: string, ok: boolean, detail: string) => checks.push({ label, ok, detail });

  add(
    'Minimax and Alpha-Beta choose the same move',
    mm.bestMove === ab.bestMove,
    `Minimax: cell ${mm.bestMove}, Alpha-Beta: cell ${ab.bestMove}`,
  );
  add(
    'Minimax and Alpha-Beta return the same score',
    mm.score === ab.score,
    `Minimax: ${mm.score}, Alpha-Beta: ${ab.score}`,
  );
  add(
    'Alpha-Beta matches the app’s engine (best move)',
    ab.bestMove === real.bestMove,
    `lab: cell ${ab.bestMove}, app: cell ${real.bestMove}`,
  );
  add(
    'Alpha-Beta matches the app’s engine (score)',
    ab.score === realScore,
    `lab: ${ab.score}, app: ${realScore}`,
  );
  add(
    'Alpha-Beta matches the app’s engine (nodes explored)',
    ab.nodes === nodes,
    `lab: ${ab.nodes}, app tree: ${nodes}`,
  );
  add(
    'Alpha-Beta matches the app’s engine (terminal nodes)',
    ab.terminal === terminal,
    `lab: ${ab.terminal}, app tree: ${terminal}`,
  );
  add(
    'Alpha-Beta matches the app’s engine (branches pruned)',
    ab.pruned === pruned,
    `lab: ${ab.pruned}, app tree: ${pruned}`,
  );
  add(
    'Alpha-Beta matches the app’s engine (deepest node)',
    ab.maxDepth === maxDepth,
    `lab: ${ab.maxDepth}, app tree: ${maxDepth}`,
  );
  add(
    'Plain Minimax never prunes',
    mm.pruned === 0 && mm.cutoffs === 0,
    `pruned: ${mm.pruned}, cutoffs: ${mm.cutoffs}`,
  );
  add(
    'Alpha-Beta never explores more nodes than Minimax',
    ab.nodes <= mm.nodes,
    `Alpha-Beta: ${ab.nodes}, Minimax: ${mm.nodes}`,
  );
  return checks;
}
