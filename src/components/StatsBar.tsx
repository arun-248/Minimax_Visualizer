import { useStore } from '../store';
import { useSearchStats } from '../lab/useSearchStats';

function formatTime(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 0.1) return `${Math.max(1, Math.round(ms * 1000))} µs`;
  if (ms < 10) return `${ms.toFixed(2)} ms`;
  return `${ms.toFixed(1)} ms`;
}

interface TileProps {
  label: string;
  value: string | number;
  sub: string;
  tone?: 'violet' | 'teal' | 'amber' | 'slate';
}

function Tile({ label, value, sub, tone = 'slate' }: TileProps) {
  return (
    <div className={`stat-tile stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

/** Live AI performance dashboard. Every number is computed from the real search. */
export function StatsBar() {
  const { hasSearch, live, total } = useSearchStats();
  const mode = useStore((s) => s.mode);
  const depthLimit = useStore((s) => s.depthLimit);
  const searchTimeMs = useStore((s) => s.searchTimeMs);

  let pill = 'Idle';
  let pillTone = 'idle';
  if (mode === 'playing' || mode === 'stepping') {
    pill = mode === 'playing' ? 'Search running' : 'Search paused';
    pillTone = 'run';
  } else if (mode === 'done') {
    pill = 'Search complete';
    pillTone = 'done';
  }

  const none = 'Run an AI search';

  return (
    <section className="stats-bar" aria-label="AI performance">
      <div className={`sim-pill sim-${pillTone}`}>
        <span className="sim-dot" aria-hidden="true" />
        {pill}
      </div>
      <div className="stats-grid">
        <Tile
          label="Nodes explored"
          value={hasSearch ? live.explored : '—'}
          sub={hasSearch ? `of ${total.explored} in this search` : none}
          tone="violet"
        />
        <Tile
          label="Terminal evaluated"
          value={hasSearch ? live.terminal : '—'}
          sub={hasSearch ? `of ${total.terminal} (wins, draws, depth limit)` : none}
          tone="teal"
        />
        <Tile
          label="Branches pruned"
          value={hasSearch ? live.pruned : '—'}
          sub={hasSearch ? `of ${total.pruned} skipped by α-β` : none}
          tone="amber"
        />
        <Tile
          label="Search depth"
          value={depthLimit === null ? '∞' : depthLimit}
          sub={hasSearch ? `deepest node visited: ${live.maxDepth}` : 'limit set in controls'}
        />
        <Tile
          label="Execution time"
          value={formatTime(hasSearch ? searchTimeMs : null)}
          sub={hasSearch ? 'to build the whole tree' : none}
        />
      </div>
    </section>
  );
}
