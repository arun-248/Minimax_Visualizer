import type { ExplorationStep } from './types';

export interface CodeLine {
  id: string;
  text: string;
  indent: number;
  kind?: 'keyword' | 'comment' | 'plain';
}

export const CODE_LINES: CodeLine[] = [
  { id: 'fn-sig',       text: 'function explore(node, α, β) {', indent: 0, kind: 'keyword' },
  { id: 'visit',        text: '▸ visit(node)',                   indent: 1, kind: 'comment' },
  { id: 'blank-1',      text: '',                                indent: 0 },
  { id: 'term-check',   text: 'if (isTerminal(node)) {',        indent: 1, kind: 'keyword' },
  { id: 'term-score',   text: 'return evaluate(node)',           indent: 2 },
  { id: 'term-end',     text: '}',                               indent: 1 },
  { id: 'blank-2',      text: '',                                indent: 0 },
  { id: 'init-best',    text: 'bestScore = isMax ? -∞ : +∞',    indent: 1 },
  { id: 'for-start',    text: 'for (each empty cell) {',        indent: 1, kind: 'keyword' },
  { id: 'make-child',   text: 'child = makeMove(cell)',          indent: 2 },
  { id: 'recurse',      text: 'score = explore(child, α, β)',   indent: 2 },
  { id: 'blank-3',      text: '',                                indent: 0 },
  { id: 'backprop',     text: '▸ backpropagate score',           indent: 2, kind: 'comment' },
  { id: 'update-best',  text: 'update bestScore',               indent: 2 },
  { id: 'update-ab',    text: 'update α or β',                  indent: 2 },
  { id: 'blank-4',      text: '',                                indent: 0 },
  { id: 'prune-check',  text: 'if (β ≤ α) {',                   indent: 2, kind: 'keyword' },
  { id: 'prune-action', text: '✂ prune remaining branches',     indent: 3, kind: 'comment' },
  { id: 'prune-break',  text: 'break',                          indent: 3, kind: 'keyword' },
  { id: 'prune-end',    text: '}',                               indent: 2 },
  { id: 'for-end',      text: '}',                               indent: 1 },
  { id: 'blank-5',      text: '',                                indent: 0 },
  { id: 'return-best',  text: 'return bestScore',               indent: 1 },
  { id: 'fn-end',       text: '}',                               indent: 0 },
];

export function getHighlightedLineId(step: ExplorationStep): string {
  switch (step.type) {
    case 'visit':
      return 'visit';
    case 'score':
      return step.isTerminal ? 'term-score' : 'return-best';
    case 'backpropagate':
      return 'backprop';
    case 'prune':
      return 'prune-action';
    default:
      return 'visit';
  }
}
