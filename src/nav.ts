export type ViewId = 'playground' | 'explorer' | 'compare' | 'learn' | 'quiz';

export interface ViewMeta {
  id: ViewId;
  num: string;
  label: string;
  sub: string;
}

export const VIEWS: ViewMeta[] = [
  { id: 'playground', num: '01', label: 'Playground', sub: 'Game + live tree' },
  { id: 'explorer', num: '02', label: 'Algorithm Explorer', sub: 'Step-by-step reasoning' },
  { id: 'compare', num: '03', label: 'Compare Algorithms', sub: 'Performance analysis' },
  { id: 'learn', num: '04', label: 'Learn Minimax', sub: 'Concepts and examples' },
  { id: 'quiz', num: '05', label: 'Knowledge Check', sub: 'Interactive questions' },
];
