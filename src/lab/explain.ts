import type { ExplorationStep, TreeNode } from '../types';
import { checkWinner } from '../minimax';
import { cellName } from './positions';
import { skippedBranches } from './stats';

/** The five phases shown on the execution timeline. */
export type PhaseId = 'visit' | 'evaluate' | 'backup' | 'prune' | 'select';

export const PHASES: { id: PhaseId; label: string; hint: string }[] = [
  { id: 'visit', label: 'Visit node', hint: 'Enter a game state' },
  { id: 'evaluate', label: 'Evaluate', hint: 'Score a position' },
  { id: 'backup', label: 'Update α / β', hint: 'Back up a child score' },
  { id: 'prune', label: 'Prune', hint: 'Cut off a branch' },
  { id: 'select', label: 'Select move', hint: 'Choose the best child' },
];

export interface Explanation {
  phase: PhaseId | null;
  title: string;
  paragraphs: string[];
}

export function fmtNum(n: number): string {
  if (n === Infinity) return '+∞';
  if (n === -Infinity) return '−∞';
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

export function phaseOf(step: ExplorationStep | null, isLast: boolean): PhaseId | null {
  if (!step) return null;
  if (isLast) return 'select';
  switch (step.type) {
    case 'visit':
      return 'visit';
    case 'score':
      return 'evaluate';
    case 'backpropagate':
      return 'backup';
    case 'prune':
      return 'prune';
  }
}

interface Ctx {
  steps: ExplorationStep[];
  nodes: Map<number, TreeNode>;
  bestMove: number | null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Plain-English explanation of one real algorithm step.
 * Everything quoted (node, player, depth, α, β, score, move) is read from the step and the tree.
 * The AI is assumed to be 'O' (the MAX player), as in the game.
 */
export function explainStep(index: number, ctx: Ctx): Explanation {
  const { steps, nodes, bestMove } = ctx;

  if (index < 0 || index >= steps.length) {
    return {
      phase: null,
      title: 'Ready to search',
      paragraphs: [
        'The AI has built its search tree but has not shown it yet.',
        'Press Next to take one step, Play to watch it run, or drag the timeline to jump anywhere.',
      ],
    };
  }

  const step = steps[index];
  const node = nodes.get(step.nodeId);
  const isLast = index === steps.length - 1;
  const role = step.isMaximizing ? 'MAX' : 'MIN';
  if (!node) return { phase: phaseOf(step, isLast), title: 'Step', paragraphs: [] };

  // ---- Final step: the root reports its score → the AI selects a move.
  if (isLast && step.type === 'score') {
    const best = node.children.find((c) => c.id === node.bestChildId);
    const move = bestMove ?? best?.move ?? null;
    const paragraphs = [
      move === null
        ? 'The root has no legal moves.'
        : `The AI (O, the MAX player) selects the child with the highest backed-up score and plays ${cellName(move)}.`,
      `Root score ${fmtNum(step.score ?? 0)}: ${
        step.score === 1
          ? 'the AI can force a win against best play (within the search depth).'
          : step.score === -1
            ? 'the human can force a win against best play (within the search depth).'
            : 'with best play on both sides the search finds no forced win for either player (or reached the depth limit).'
      }`,
    ];
    if (node.children.some((c) => c.pruned)) {
      paragraphs.push(
        'Because of pruning, some root moves only have a bound (shown with ≤) instead of an exact score: the search stopped once they were proven no better than the move already found.',
      );
    }
    return { phase: 'select', title: move === null ? 'Search complete' : `Decision: play ${cellName(move)}`, paragraphs };
  }

  switch (step.type) {
    case 'visit': {
      if (node.move === null) {
        return {
          phase: 'visit',
          title: 'Search begins at the root',
          paragraphs: [
            'The AI (O) is the MAX player: it wants the highest score, so it will choose the child with the best backed-up value.',
            `The window starts fully open: α = ${fmtNum(step.alpha)}, β = ${fmtNum(step.beta)}.`,
          ],
        };
      }
      const mover = node.isMaximizing ? 'X (the human)' : 'O (the AI)';
      const paragraphs = [
        `${mover} played ${cellName(node.move)}, reaching this position at depth ${node.depth}.`,
        node.isMaximizing
          ? 'It is the AI’s turn here, so this MAX node will back up the highest score among its children.'
          : 'It is the human’s turn here, so the algorithm assumes X picks the reply that is worst for the AI: this MIN node backs up the lowest score.',
        `Bounds inherited from the parent: α = ${fmtNum(step.alpha)}, β = ${fmtNum(step.beta)}. They tell this node which scores can still change the decision above it.`,
      ];
      if (node.isTerminal) {
        paragraphs.push('This position is terminal, so it will be scored immediately instead of expanding children.');
      }
      return { phase: 'visit', title: `Visiting a ${role} node`, paragraphs };
    }

    case 'score': {
      const s = step.score ?? 0;
      if (step.isTerminal) {
        const winner = checkWinner(node.board);
        const why =
          winner === 'O' || winner === 'X'
            ? `${winner} has three in a row.`
            : winner === 'draw'
              ? 'The board is full with no winner (a draw).'
              : `The search depth limit (${node.depth}) was reached before the game ended, so the unfinished position is scored 0. This is a limitation of depth-limited search, not a real draw.`;
        return {
          phase: 'evaluate',
          title: `Terminal position scored ${fmtNum(s)}`,
          paragraphs: [why, 'Scoring rule: +1 if the AI (O) wins, −1 if the human (X) wins, 0 otherwise.'],
        };
      }
      const best = nodes.get(node.bestChildId ?? -1);
      const skipped = skippedBranches(node);
      const paragraphs = [
        node.isMaximizing
          ? `All explored moves are done. As a MAX node it keeps the highest child score: ${fmtNum(s)}${best?.move != null ? `, via ${cellName(best.move)}` : ''}.`
          : `All explored moves are done. As a MIN node it keeps the lowest child score: ${fmtNum(s)}${best?.move != null ? `, via ${cellName(best.move)}` : ''}.`,
      ];
      if (node.pruned) {
        paragraphs.push(
          skipped > 0
            ? `It stopped early: ${plural(skipped, 'later branch')} ${skipped === 1 ? 'was' : 'were'} never examined.`
            : 'It met the cutoff condition on its last move, so nothing was skipped.',
        );
      }
      paragraphs.push('This score is now returned to the parent node.');
      return { phase: 'evaluate', title: `${role} node scored ${fmtNum(s)}`, paragraphs };
    }

    case 'backpropagate': {
      const s = step.score ?? 0;
      const a = step.alpha;
      const b = step.beta;
      const child = index > 0 ? nodes.get(steps[index - 1].nodeId) : undefined;
      const next = steps[index + 1];
      const paragraphs: string[] = [];
      paragraphs.push(
        `${child?.move != null ? `Move ${cellName(child.move)}` : 'A child'} returned ${fmtNum(s)} to this ${role} node. ${
          step.isMaximizing ? 'MAX keeps the largest score it has seen.' : 'MIN keeps the smallest score it has seen.'
        }`,
      );
      if (step.isMaximizing) {
        paragraphs.push(
          s > a
            ? `${fmtNum(s)} beats the current α (${fmtNum(a)}), so α rises to ${fmtNum(s)}: MAX can now guarantee at least ${fmtNum(s)}.`
            : `${fmtNum(s)} does not beat α (${fmtNum(a)}), so α stays at ${fmtNum(a)}.`,
        );
      } else {
        paragraphs.push(
          s < b
            ? `${fmtNum(s)} is lower than the current β (${fmtNum(b)}), so β falls to ${fmtNum(s)}: MIN can now hold the score to at most ${fmtNum(s)}.`
            : `${fmtNum(s)} is not lower than β (${fmtNum(b)}), so β stays at ${fmtNum(b)}.`,
        );
      }
      const newA = step.isMaximizing ? Math.max(a, s) : a;
      const newB = step.isMaximizing ? b : Math.min(b, s);
      if (next?.type === 'prune') {
        paragraphs.push(`Now β (${fmtNum(newB)}) ≤ α (${fmtNum(newA)}): the cutoff condition is met.`);
      } else if (next?.type === 'score' && next.nodeId === step.nodeId) {
        paragraphs.push('That was the last move to try, so this node can now report its score.');
      } else {
        paragraphs.push(
          `The window [α, β] = [${fmtNum(newA)}, ${fmtNum(newB)}] is still open, so the search continues with the next move.`,
        );
      }
      return { phase: 'backup', title: `Backing up into a ${role} node`, paragraphs };
    }

    case 'prune': {
      const skipped = skippedBranches(node);
      return {
        phase: 'prune',
        title: 'Pruning: β ≤ α',
        paragraphs: [
          `β (${fmtNum(step.beta)}) is now ≤ α (${fmtNum(step.alpha)}).`,
          step.isMaximizing
            ? 'This MAX node already found a score at least as good as what a MIN ancestor will allow. That ancestor already has a reply at most β, so it will never steer play here. Searching the other moves cannot change the final decision.'
            : 'This MIN node can already hold the score down to at most α. A MAX ancestor already has a move worth at least α, so it will never choose this branch. Searching the other replies cannot change the final decision.',
          skipped > 0
            ? `${plural(skipped, 'remaining branch')} ${skipped === 1 ? 'is' : 'are'} skipped without being evaluated.`
            : 'No branches were left to skip here, but the cutoff condition was still met.',
        ],
      };
    }
  }
}

export interface Candidate {
  cell: number;
  state: 'queued' | 'searching' | 'scored';
  score: number | null;
  /** '≤' / '≥' when pruning stopped the child early, so its score is only a bound. */
  bound: '' | '≤' | '≥';
  isBest: boolean;
}

/** One row per legal root move, reflecting only what has been explored so far. */
export function rootCandidates(
  root: TreeNode,
  visited: Set<number>,
  scored: Set<number>,
  finished: boolean,
): Candidate[] {
  const rows: Candidate[] = [];
  for (let i = 0; i < 9; i++) {
    if (root.board[i] !== null) continue;
    const child = root.children.find((c) => c.move === i);
    if (!child || !visited.has(child.id)) {
      rows.push({ cell: i, state: 'queued', score: null, bound: '', isBest: false });
      continue;
    }
    const isScored = scored.has(child.id);
    rows.push({
      cell: i,
      state: isScored ? 'scored' : 'searching',
      score: isScored ? child.score : null,
      bound: isScored && child.pruned ? (child.isMaximizing ? '≥' : '≤') : '',
      isBest: finished && child.id === root.bestChildId,
    });
  }
  return rows;
}
