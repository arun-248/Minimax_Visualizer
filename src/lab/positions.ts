import type { Board } from '../types';

/** Parse a 9-character string ('X', 'O', '_') into a Board. */
export function parseBoard(s: string): Board {
  return s.split('').map((c) => (c === 'X' ? 'X' : c === 'O' ? 'O' : null));
}

export interface Position {
  id: string;
  label: string;
  note: string;
  board: Board;
}

/**
 * Example positions with the AI (O, the MAX player) to move.
 * Every board has #X = #O + 1, no winner yet. The numbers shown in the UI for these
 * positions (node counts, scores, best moves) are always computed by running the engine.
 */
export const POSITIONS: Position[] = [
  {
    id: 'lesson',
    label: 'Small tactical position',
    note: '4 empty cells · the position used in the tutorial',
    board: parseBoard('XXOO__X__'),
  },
  {
    id: 'draw',
    label: 'Small drawn position',
    note: '4 empty cells · best play ends in a draw',
    board: parseBoard('XXOO_X___'),
  },
  {
    id: 'mid-a',
    label: 'Mid-game A',
    note: '6 empty cells',
    board: parseBoard('_X_O_X___'),
  },
  {
    id: 'mid-b',
    label: 'Mid-game B',
    note: '6 empty cells',
    board: parseBoard('___XX_O__'),
  },
  {
    id: 'mid-c',
    label: 'Mid-game C',
    note: '6 empty cells',
    board: parseBoard('XO_____X_'),
  },
  {
    id: 'centre',
    label: 'After X takes the centre',
    note: '8 empty cells · the largest search the app allows',
    board: parseBoard('____X____'),
  },
  {
    id: 'corner',
    label: 'After X takes a corner',
    note: '8 empty cells',
    board: parseBoard('X________'),
  },
];

export const LESSON_BOARD: Board = POSITIONS[0].board;
export const DRAW_BOARD: Board = POSITIONS[1].board;

/** Row/column text for a cell index, e.g. 4 → "row 2, col 2". */
export function cellName(i: number): string {
  return `row ${Math.floor(i / 3) + 1}, col ${(i % 3) + 1}`;
}
