import { useMemo } from 'react';
import { useStore } from '../store';
import { buildStatsIndex, statsAt, EMPTY_STATS, type SearchStats } from './stats';

export interface SearchStatsView {
  hasSearch: boolean;
  /** Statistics for the steps executed so far (follows playback / scrubbing). */
  live: SearchStats;
  /** Statistics for the complete search. */
  total: SearchStats;
}

/** Reads the real tree + steps from the store and exposes live and total search statistics. */
export function useSearchStats(): SearchStatsView {
  const tree = useStore((s) => s.tree);
  const steps = useStore((s) => s.steps);
  const currentStepIndex = useStore((s) => s.currentStepIndex);

  const index = useMemo(() => (tree ? buildStatsIndex(tree, steps) : null), [tree, steps]);

  if (!index || index.length === 0) {
    return { hasSearch: false, live: EMPTY_STATS, total: EMPTY_STATS };
  }
  return {
    hasSearch: true,
    live: statsAt(index, currentStepIndex),
    total: statsAt(index, index.length - 1),
  };
}
