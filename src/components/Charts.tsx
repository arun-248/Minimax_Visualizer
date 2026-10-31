/* Hand-drawn SVG / CSS charts. No chart library is used. */

interface BarPairProps {
  title: string;
  a: { label: string; value: number };
  b: { label: string; value: number };
  format?: (n: number) => string;
  note?: string;
}

/** Two horizontal bars on a shared scale. Bar A is violet (Minimax), bar B is teal (Alpha-Beta). */
export function BarPair({ title, a, b, format = (n) => n.toLocaleString(), note }: BarPairProps) {
  const max = Math.max(a.value, b.value, 1e-9);
  const pct = (v: number) => Math.max((v / max) * 100, v > 0 ? 1.5 : 0);
  return (
    <figure
      className="chart card"
      role="img"
      aria-label={`${title}: ${a.label} ${format(a.value)}, ${b.label} ${format(b.value)}`}
    >
      <figcaption className="chart-title">{title}</figcaption>
      <div className="bar-row">
        <span className="bar-label">{a.label}</span>
        <div className="bar-track">
          <div className="bar bar-a" style={{ width: `${pct(a.value)}%` }} />
        </div>
        <span className="bar-value">{format(a.value)}</span>
      </div>
      <div className="bar-row">
        <span className="bar-label">{b.label}</span>
        <div className="bar-track">
          <div className="bar bar-b" style={{ width: `${pct(b.value)}%` }} />
        </div>
        <span className="bar-value">{format(b.value)}</span>
      </div>
      {note && <p className="chart-note">{note}</p>}
    </figure>
  );
}

interface DepthChartProps {
  a: number[];
  b: number[];
  aLabel: string;
  bLabel: string;
}

/** Grouped columns: nodes visited at each depth. Shows where pruning removes work. */
export function DepthChart({ a, b, aLabel, bLabel }: DepthChartProps) {
  const depths = Math.max(a.length, b.length);
  const max = Math.max(1, ...a, ...b);
  const W = 560;
  const H = 190;
  const padL = 44;
  const padB = 28;
  const padT = 10;
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const group = innerW / Math.max(depths, 1);
  const barW = Math.min(26, group / 2 - 3);

  // 4 round-ish y ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

  return (
    <figure
      className="chart card"
      role="img"
      aria-label={`Nodes visited at each depth. ${aLabel}: ${a.join(', ')}. ${bLabel}: ${b.join(', ')}.`}
    >
      <figcaption className="chart-title">Nodes visited at each depth</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="depth-svg" aria-hidden="true">
        {ticks.map((t, i) => {
          const y = padT + innerH - (t / max) * innerH;
          return (
            <g key={i}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} className="chart-grid" />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" className="chart-axis">
                {fmt(t)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: depths }, (_, d) => {
          const cx = padL + group * d + group / 2;
          const ha = ((a[d] ?? 0) / max) * innerH;
          const hb = ((b[d] ?? 0) / max) * innerH;
          return (
            <g key={d}>
              <rect
                x={cx - barW - 1}
                y={padT + innerH - ha}
                width={barW}
                height={ha}
                rx={3}
                className="bar-a"
              />
              <rect x={cx + 1} y={padT + innerH - hb} width={barW} height={hb} rx={3} className="bar-b" />
              <text x={cx} y={H - 8} textAnchor="middle" className="chart-axis">
                {d}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-key">
        <span>
          <i className="bar-a" /> {aLabel}
        </span>
        <span>
          <i className="bar-b" /> {bLabel}
        </span>
        <span className="chart-key-axis">x-axis: depth (0 = root)</span>
      </div>
    </figure>
  );
}
