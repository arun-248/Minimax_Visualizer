import { useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { useStore } from '../store';
import { PHASES, phaseOf } from '../lab/explain';
import { PlaybackControls } from './PlaybackControls';

const MAX_BINS = 180;

type BinKind = 'visit' | 'backup' | 'terminal' | 'prune';

/**
 * Execution timeline: phase indicator, a clickable/draggable strip of every step,
 * and prev/next/play controls. Seeking goes through the store's vizSeek, so the tree,
 * stats, reasoning panel and debugger all stay in sync.
 */
export function Timeline() {
  const steps = useStore((s) => s.steps);
  const currentStepIndex = useStore((s) => s.currentStepIndex);
  const vizSeek = useStore((s) => s.vizSeek);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const n = steps.length;
  const index = Math.min(currentStepIndex, n - 1);
  const phase = phaseOf(index >= 0 ? steps[index] : null, n > 0 && index === n - 1);

  // Summarise thousands of steps into at most MAX_BINS coloured cells.
  const bins = useMemo(() => {
    if (n === 0) return [] as BinKind[];
    const count = Math.min(n, MAX_BINS);
    const size = n / count;
    const out: BinKind[] = [];
    for (let b = 0; b < count; b++) {
      const from = Math.floor(b * size);
      const to = Math.max(from + 1, Math.floor((b + 1) * size));
      let kind: BinKind = 'visit';
      for (let i = from; i < to && i < n; i++) {
        const s = steps[i];
        if (s.type === 'prune') {
          kind = 'prune';
          break;
        }
        if (s.type === 'score' && s.isTerminal) kind = 'terminal';
        else if (s.type === 'backpropagate' && kind === 'visit') kind = 'backup';
      }
      out.push(kind);
    }
    return out;
  }, [steps, n]);

  const seekFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const el = stripRef.current;
    if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    vizSeek(Math.min(n - 1, Math.floor(frac * n)));
  };

  if (n === 0) {
    return (
      <section className="card timeline" aria-label="Execution timeline">
        <h2 className="group-title">Execution timeline</h2>
        <p className="reasoning-empty">The timeline appears once the AI has searched a position.</p>
      </section>
    );
  }

  const markerPct = index >= 0 ? ((index + 0.5) / n) * 100 : 0;

  return (
    <section className="card timeline" aria-label="Execution timeline">
      <div className="timeline-top">
        <h2 className="group-title">Execution timeline</h2>
        <ol className="phases" aria-label="Algorithm phases">
          {PHASES.map((p, i) => (
            <li key={p.id} className={'phase' + (phase === p.id ? ` phase-on phase-${p.id}` : '')}>
              <span className="phase-num">{i + 1}</span>
              <span className="phase-text">
                <span className="phase-label">{p.label}</span>
                <span className="phase-hint">{p.hint}</span>
              </span>
            </li>
          ))}
        </ol>
        <span className="progress-text">
          {Math.max(index + 1, 0)} / {n}
        </span>
      </div>

      <div className="timeline-main">
        <div className="timeline-controls">
          <PlaybackControls compact />
        </div>
        <div className="timeline-scrub">
          <div
            ref={stripRef}
            className="strip"
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              seekFromPointer(e);
            }}
            onPointerMove={(e) => {
              if (dragging.current) seekFromPointer(e);
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            {bins.map((kind, i) => (
              <span key={i} className={`bin bin-${kind}`} />
            ))}
            {index >= 0 && <span className="strip-marker" style={{ left: `${markerPct}%` }} />}
          </div>
          <input
            className="range scrub-range"
            type="range"
            min={-1}
            max={n - 1}
            step={1}
            value={index}
            aria-label="Search step"
            onChange={(e) => vizSeek(Number(e.target.value))}
            style={{ '--fill': `${((index + 1) / n) * 100}%` } as CSSProperties}
          />
          <div className="strip-key" aria-hidden="true">
            <span><i className="bin-visit" /> visit</span>
            <span><i className="bin-backup" /> back up α/β</span>
            <span><i className="bin-terminal" /> terminal scored</span>
            <span><i className="bin-prune" /> prune</span>
          </div>
        </div>
      </div>
    </section>
  );
}
