import type { Board } from '../types';
import { buildMinimaxTree } from '../minimax';
import { buildFullTree } from './fullTree';
import { countSearch } from './search';
import { emptyCells, indexNodes, skippedBranches } from './stats';
import { cellName, LESSON_BOARD, parseBoard } from './positions';
import { fmtNum } from './explain';

/**
 * The knowledge-check questions.
 * Wording is written by hand, but every number, move and "correct answer" is computed by
 * running the same engine the app uses (buildMinimaxTree / the exact full tree / the counting search).
 */
interface Base {
  id: string;
  topic: string;
  prompt: string;
  explanation: string;
}

export interface ChoiceQuestion extends Base {
  kind: 'choice';
  board?: Board;
  options: string[];
  answer: number;
}

/** Click one cell. Any cell in `answers` is correct (several moves can be equally optimal). */
export interface CellQuestion extends Base {
  kind: 'cell';
  board: Board;
  answers: number[];
}

/** Select every cell that matches, then check. `marks` are cells shown with a dot as context. */
export interface CellsQuestion extends Base {
  kind: 'cells';
  board: Board;
  answers: number[];
  marks: number[];
}

export type Question = ChoiceQuestion | CellQuestion | CellsQuestion;

/** Put `correct` at a deterministic position among distractors (no randomness → pure). */
function arrange(correct: string, distractors: string[], seed: number): { options: string[]; answer: number } {
  const unique = [correct, ...distractors.filter((d, i, a) => d !== correct && a.indexOf(d) === i)].slice(0, 4);
  const others = unique.slice(1);
  const pos = seed % unique.length;
  const options = [...others];
  options.splice(pos, 0, correct);
  return { options, answer: pos };
}

const num = (n: number) => fmtNum(n);

export function buildQuiz(): Question[] {
  const qs: Question[] = [];

  // 1 · concept: what a MIN node backs up
  {
    const { options, answer } = arrange(
      'The smallest child score',
      ['The largest child score', 'The average of the child scores', 'The score of the first child'],
      2,
    );
    qs.push({
      id: 'min-rule',
      kind: 'choice',
      topic: 'MAX and MIN',
      prompt: 'A MIN node (the human to move) has several children. Which score does it back up to its parent?',
      options,
      answer,
      explanation:
        'MIN assumes the human picks the reply that is worst for the AI, which is the lowest score. MAX nodes take the largest.',
    });
  }

  // 2 · terminal scoring (engine)
  {
    const board = parseBoard('XXXOO____');
    const score = buildMinimaxTree(board, 'O', null).tree.score ?? 0;
    const { options, answer } = arrange(num(score), [num(1), num(0), num(-1)].filter((x) => x !== num(score)), 1);
    qs.push({
      id: 'terminal-x',
      kind: 'choice',
      topic: 'Terminal evaluation',
      prompt: 'X has completed the top row. What score does the engine give this finished board (the AI is O)?',
      board,
      options,
      answer,
      explanation:
        'A win for the human (X) is −1, a win for the AI (O) is +1 and a draw is 0. The engine returned ' +
        num(score) +
        ' for this board.',
    });
  }

  // 3 · depth limit (engine)
  {
    const limited = buildMinimaxTree(LESSON_BOARD, 'O', 0).tree.score ?? 0;
    const truth = buildMinimaxTree(LESSON_BOARD, 'O', null).tree.score ?? 0;
    const { options, answer } = arrange(
      `${num(limited)} (unfinished boards count as 0)`,
      [`${num(truth)} (the true value)`, `${num(-truth || -1)} (assume the worst)`, 'It cannot score it'],
      3,
    );
    qs.push({
      id: 'depth-limit',
      kind: 'choice',
      topic: 'Terminal evaluation',
      prompt:
        'This game is not over, but the search depth limit is 0, so the engine must stop immediately. What score does it assign?',
      board: LESSON_BOARD,
      options,
      answer,
      explanation: `At the depth limit the engine scores an unfinished position ${num(limited)}. With unlimited depth the same position is worth ${num(truth)}, so a depth-limited 0 means “not decided yet”.`,
    });
  }

  // 4-6 · predict the next move (exact full-tree values)
  const predictBoards: { id: string; board: Board }[] = [
    { id: 'predict-1', board: LESSON_BOARD },
    { id: 'predict-2', board: parseBoard('XXOO_X___') },
    { id: 'predict-3', board: parseBoard('XXOX_O___') },
  ];
  for (const p of predictBoards) {
    const root = buildFullTree(p.board);
    const answers = root.children.filter((c) => c.value === root.value).map((c) => c.move as number);
    qs.push({
      id: p.id,
      kind: 'cell',
      topic: 'Predict the move',
      prompt: 'You are the AI (O) and it is your move. Click the cell that Minimax would play.',
      board: p.board,
      answers,
      explanation:
        `Minimax values every move: ${root.children
          .map((c) => `${cellName(c.move as number)} → ${num(c.value)}`)
          .join(', ')}. ` +
        (answers.length > 1
          ? `Several moves share the best value (${num(root.value)}), so any of ${answers
              .map(cellName)
              .join(' / ')} is optimal.`
          : `The best value is ${num(root.value)}, reached only by ${cellName(answers[0])}.`),
    });
  }

  // 7-9 · alpha / beta updates (real steps from the lesson search)
  const real = buildMinimaxTree(LESSON_BOARD, 'O', null);
  const finite = (n: number) => Number.isFinite(n);
  const backs = real.steps.filter((s) => s.type === 'backpropagate' && s.score !== null);

  const maxChange =
    backs.find((s) => s.isMaximizing && finite(s.alpha) && (s.score as number) > s.alpha) ??
    backs.find((s) => s.isMaximizing && (s.score as number) > s.alpha);
  if (maxChange) {
    const a = maxChange.alpha;
    const b = maxChange.beta;
    const s = maxChange.score as number;
    const correct = num(Math.max(a, s));
    const { options, answer } = arrange(correct, [num(a), num(b), num(-s)].concat([num(0), num(1)]), 0);
    qs.push({
      id: 'alpha-up',
      kind: 'choice',
      topic: 'Alpha and beta',
      prompt: `A MAX node has the window α = ${num(a)}, β = ${num(b)}. One of its children returns ${num(s)}. What is α afterwards?`,
      options,
      answer,
      explanation: `MAX keeps the larger value: α = max(${num(a)}, ${num(s)}) = ${correct}. α only ever rises.`,
    });
  }

  const minChange =
    backs.find((s) => !s.isMaximizing && finite(s.beta) && (s.score as number) < s.beta) ??
    backs.find((s) => !s.isMaximizing && (s.score as number) < s.beta);
  if (minChange) {
    const a = minChange.alpha;
    const b = minChange.beta;
    const s = minChange.score as number;
    const correct = num(Math.min(b, s));
    const { options, answer } = arrange(correct, [num(b), num(a), num(-s)].concat([num(0), num(-1)]), 2);
    qs.push({
      id: 'beta-down',
      kind: 'choice',
      topic: 'Alpha and beta',
      prompt: `A MIN node has the window α = ${num(a)}, β = ${num(b)}. One of its children returns ${num(s)}. What is β afterwards?`,
      options,
      answer,
      explanation: `MIN keeps the smaller value: β = min(${num(b)}, ${num(s)}) = ${correct}. β only ever falls.`,
    });
  }

  const same =
    backs.find((s) => s.isMaximizing && finite(s.alpha) && (s.score as number) <= s.alpha) ??
    backs.find((s) => !s.isMaximizing && finite(s.beta) && (s.score as number) >= s.beta);
  if (same) {
    const isMax = same.isMaximizing;
    const a = same.alpha;
    const b = same.beta;
    const s = same.score as number;
    const keep = isMax ? a : b;
    const { options, answer } = arrange(
      num(keep),
      [num(s === keep ? keep + 1 : s), num(isMax ? b : a), num(0), num(1), num(-1)],
      1,
    );
    qs.push({
      id: 'bound-same',
      kind: 'choice',
      topic: 'Alpha and beta',
      prompt: `A ${isMax ? 'MAX' : 'MIN'} node has α = ${num(a)}, β = ${num(b)}. A child returns ${num(s)}. What is ${isMax ? 'α' : 'β'} afterwards?`,
      options,
      answer,
      explanation: isMax
        ? `${num(s)} does not beat α = ${num(a)}, so α = max(${num(a)}, ${num(s)}) = ${num(a)}: no change.`
        : `${num(s)} is not lower than β = ${num(b)}, so β = min(${num(b)}, ${num(s)}) = ${num(b)}: no change.`,
    });
  }

  // 10 · identify the pruned branches (cells)
  {
    const nodes = indexNodes(real.tree);
    const pruneStep = real.steps.find((s) => {
      if (s.type !== 'prune') return false;
      const n = nodes.get(s.nodeId);
      return !!n && n.move !== null && skippedBranches(n) >= 1 && emptyCells(n.board) >= 3;
    });
    if (pruneStep) {
      const node = nodes.get(pruneStep.nodeId)!;
      const tried = node.children.map((c) => c.move as number);
      const skipped: number[] = [];
      node.board.forEach((c, i) => {
        if (c === null && !tried.includes(i)) skipped.push(i);
      });
      qs.push({
        id: 'prune-cells',
        kind: 'cells',
        topic: 'Pruning',
        prompt: `This ${node.isMaximizing ? 'MAX' : 'MIN'} node was searched in order (cells 1 to 9). A cutoff fired after the moves marked with a dot (α = ${num(pruneStep.alpha)}, β = ${num(pruneStep.beta)}). Select every move that was pruned, never searched.`,
        board: node.board,
        marks: tried,
        answers: skipped,
        explanation: `After the last dotted move β (${num(pruneStep.beta)}) ≤ α (${num(pruneStep.alpha)}), so the remaining empty cells (${skipped
          .map(cellName)
          .join('; ')}) were skipped.`,
      });
    }
  }

  // 11 · how many nodes does alpha-beta explore (counting engines)
  {
    const mm = countSearch(LESSON_BOARD, 'O', null, false);
    const ab = countSearch(LESSON_BOARD, 'O', null, true);
    const { options, answer } = arrange(
      String(ab.nodes),
      [String(mm.nodes), String(ab.terminal), String(ab.nodes + 10)],
      3,
    );
    qs.push({
      id: 'node-count',
      kind: 'choice',
      topic: 'Pruning',
      prompt: `Plain Minimax visits ${mm.nodes} nodes in this position. Alpha-Beta finds the same move. How many nodes does Alpha-Beta visit?`,
      board: LESSON_BOARD,
      options,
      answer,
      explanation: `Alpha-Beta visits ${ab.nodes} nodes (${mm.nodes - ab.nodes} fewer) and prunes ${ab.pruned} branches, yet returns the same best move, ${cellName(ab.bestMove)}.`,
    });
  }

  // 12 · pruning never changes the decision
  {
    const { options, answer } = arrange(
      'No — it only skips work that cannot change the result',
      [
        'Yes — it may pick a slightly worse move to save time',
        'Yes — but only at depth 1',
        'Only when the opponent plays badly',
      ],
      0,
    );
    qs.push({
      id: 'prune-safe',
      kind: 'choice',
      topic: 'Pruning',
      prompt: 'Can Alpha-Beta pruning make the AI choose a different move than full Minimax would?',
      options,
      answer,
      explanation:
        'A branch is pruned only when it provably cannot beat a result that is already guaranteed, so the chosen move and its value are identical. The Compare page checks this on every run.',
    });
  }

  return qs;
}
