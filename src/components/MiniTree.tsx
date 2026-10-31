import type { FullNode, TreeLayout } from '../lab/fullTree';
import { fmtNum } from '../lab/explain';

export type NodeStatus = 'hidden' | 'pending' | 'active' | 'scored' | 'pruned';

interface MiniTreeProps {
  layout: TreeLayout;
  statusOf: (n: FullNode) => NodeStatus;
  /** Value to print inside a node (null = print nothing). */
  labelOf: (n: FullNode) => number | null;
  currentKey?: string | null;
  bestKeys?: Set<string>;
  selectedKey?: string | null;
  onSelect?: (n: FullNode) => void;
  ariaLabel: string;
}

const HALF = 12;

/** Compact SVG game tree used by the tutorial demos. */
export function MiniTree({
  layout,
  statusOf,
  labelOf,
  currentKey,
  bestKeys,
  selectedKey,
  onSelect,
  ariaLabel,
}: MiniTreeProps) {
  const { items, width, height } = layout;
  return (
    <svg
      className="mini-tree"
      viewBox={`0 0 ${Math.max(width, 120)} ${height}`}
      role="img"
      aria-label={ariaLabel}
    >
      {/* edges first so nodes sit on top */}
      {items.map((it, i) => {
        if (it.parent < 0) return null;
        const p = items[it.parent];
        const status = statusOf(it.node);
        if (status === 'hidden') return null;
        const best = bestKeys?.has(it.node.key) && bestKeys.has(p.node.key);
        return (
          <line
            key={'e' + i}
            x1={p.x}
            y1={p.y + HALF}
            x2={it.x}
            y2={it.y - HALF}
            className={
              'mt-edge' + (status === 'pruned' ? ' mt-edge-pruned' : '') + (best ? ' mt-edge-best' : '')
            }
          />
        );
      })}
      {items.map((it, i) => {
        const n = it.node;
        const status = statusOf(n);
        if (status === 'hidden') return null;
        const label = labelOf(n);
        const isCurrent = currentKey === n.key;
        const isBest = bestKeys?.has(n.key);
        const isSelected = selectedKey === n.key;
        const interactive = !!onSelect && status !== 'pruned';
        return (
          <g
            key={'n' + i}
            transform={`translate(${it.x}, ${it.y})`}
            className={
              `mt-node mt-${n.isMax ? 'max' : 'min'} mt-${status}` +
              (isCurrent ? ' mt-current' : '') +
              (isBest ? ' mt-best' : '') +
              (isSelected ? ' mt-selected' : '') +
              (interactive ? ' mt-click' : '')
            }
            onClick={interactive ? () => onSelect(n) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(n);
                    }
                  }
                : undefined
            }
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? 'button' : undefined}
            aria-label={
              interactive
                ? `${n.isMax ? 'MAX' : 'MIN'} node at depth ${n.depth}${label !== null ? `, value ${fmtNum(label)}` : ''}`
                : undefined
            }
          >
            <rect x={-HALF} y={-HALF} width={HALF * 2} height={HALF * 2} rx={7} />
            {status === 'pruned' ? (
              <text textAnchor="middle" dy="4" className="mt-cut">
                ✂
              </text>
            ) : (
              label !== null && (
                <text textAnchor="middle" dy="3.8">
                  {fmtNum(label)}
                </text>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}
