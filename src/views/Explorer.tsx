import { useState } from 'react';
import { useStore } from '../store';
import { StatsBar } from '../components/StatsBar';
import { TreeVisualizer } from '../components/TreeVisualizer';
import { ReasoningPanel } from '../components/ReasoningPanel';
import { Timeline } from '../components/Timeline';
import { CodeDebugger } from '../components/CodeDebugger';
import { Icon } from '../components/Icon';
import { POSITIONS } from '../lab/positions';

const DEPTHS: { value: string; label: string }[] = [
  { value: '3', label: 'Depth 3 · Easy' },
  { value: '4', label: 'Depth 4 · Normal' },
  { value: '5', label: 'Depth 5 · Hard' },
  { value: '6', label: 'Depth 6 · Expert' },
  { value: 'full', label: 'Full depth · Unbeatable' },
];

/** 02 · Algorithm Explorer: investigate one search step by step. */
export function Explorer() {
  const tree = useStore((s) => s.tree);
  const depthLimit = useStore((s) => s.depthLimit);
  const setDepthLimit = useStore((s) => s.setDepthLimit);
  const loadPosition = useStore((s) => s.loadPosition);
  const [positionId, setPositionId] = useState(POSITIONS[0].id);

  const position = POSITIONS.find((p) => p.id === positionId) ?? POSITIONS[0];

  return (
    <div className="view explorer">
      <StatsBar />

      <div className="toolbar card">
        <div className="toolbar-field">
          <label htmlFor="pos-select" className="setting-label">
            Example position
          </label>
          <select
            id="pos-select"
            className="select"
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
          >
            {POSITIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.note}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-field">
          <label htmlFor="depth-select" className="setting-label">
            Search depth
          </label>
          <select
            id="depth-select"
            className="select"
            value={depthLimit === null ? 'full' : String(depthLimit)}
            onChange={(e) => setDepthLimit(e.target.value === 'full' ? null : Number(e.target.value))}
          >
            {DEPTHS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => loadPosition(position.board)}>
          <Icon>
            <path d="M4 2.8v10.4a.6.6 0 00.92.5l8.2-5.2a.6.6 0 000-1L4.92 2.3a.6.6 0 00-.92.5z" />
          </Icon>
          Load &amp; search
        </button>
        <p className="toolbar-note">
          Loads the position onto the game board with the AI (O) to move. You can also explore the
          search from a game you played in the Playground.
        </p>
      </div>

      <div className="explore-grid">
        <section className="stage explore-tree" aria-label="Decision tree">
          <div className="stage-tree">
            {tree ? (
              <TreeVisualizer />
            ) : (
              <div className="tree-container tree-empty">
                <div className="tree-placeholder">
                  <p className="tree-placeholder-title">No search to explore yet</p>
                  <p className="tree-placeholder-sub">
                    Choose an example position above and press “Load &amp; search”, or play two
                    moves in the Playground.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="explore-side">
          <ReasoningPanel />
          <CodeDebugger variant="panel" />
        </div>

        <div className="explore-timeline">
          <Timeline />
        </div>
      </div>
    </div>
  );
}
