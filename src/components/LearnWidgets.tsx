import { useMemo, useState, type CSSProperties } from 'react';
import { buildMinimaxTree } from '../minimax';
import type { Board } from '../types';
import { MiniTree, type NodeStatus } from './MiniTree';
import { Icon } from './Icon';
import {
  buildFullTree,
  countNodes,
  keyRealTree,
  layoutTree,
  maxDepthOf,
  type FullNode,
} from '../lab/fullTree';
import { explainStep, fmtNum } from '../lab/explain';
import { countSearch } from '../lab/search';
import { indexNodes } from '../lab/stats';
import { cellName, LESSON_BOARD, parseBoard } from '../lab/positions';

/* ---------------------------------------------------------------- shared */

function BoardView({
  board,
  onCell,
  highlight,
  label,
}: {
  board: Board;
  onCell?: (i: number) => void;
  highlight?: number | null;
  label: string;
}) {
  return (
    <div className="lw-board" role="group" aria-label={label}>
      {board.map((c, i) => {
        const clickable = !!onCell && c === null;
        const cls =
          'lw-cell' + (c ? ` lw-${c}` : '') + (clickable ? ' lw-open' : '') + (highlight === i ? ' lw-hl' : '');
        return clickable ? (
          <button key={i} className={cls} onClick={() => onCell(i)} aria-label={`Play ${cellName(i)}`}>
            <span className="lw-ghost">O</span>
          </button>
        ) : (
          <span key={i} className={cls}>
            {c ?? ''}
          </span>
        );
      })}
    </div>
  );
}

function valueText(v: number): string {
  return v > 0 ? 'a win for the AI (+1)' : v < 0 ? 'a win for the human (−1)' : 'a draw (0)';
}

/* ------------------------------------------------ 1 · adversarial search */

/** Click one of the AI's moves and see what a perfect opponent can hold it to. */
export function AdversaryDemo() {
  const root = useMemo(() => buildFullTree(LESSON_BOARD), []);
  const [picked, setPicked] = useState<number | null>(null);
  const child = picked === null ? null : root.children.find((c) => c.move === picked) ?? null;
  const reply = child && child.bestIndex >= 0 ? child.children[child.bestIndex] : null;
  const shown = child ? child.board : root.board;

  return (
    <div className="lw-row">
      <BoardView board={shown} onCell={child ? undefined : setPicked} highlight={picked} label="Position" />
      <div className="lw-text">
        {!child ? (
          <p>
            You are <strong>O</strong>, the AI, and it is your move. Click an empty cell to try it. Your
            opponent <strong>X</strong> will answer as well as possible.
          </p>
        ) : (
          <>
            <p>
              After <strong>O plays {cellName(picked!)}</strong>, a perfect X can hold the game to{' '}
              <strong>{valueText(child.value)}</strong>.
            </p>
            {reply && reply.move !== null && !child.terminal && (
              <p>
                X’s best reply is <strong>{cellName(reply.move)}</strong>.
              </p>
            )}
            <button className="btn" onClick={() => setPicked(null)}>
              Try another move
            </button>
          </>
        )}
        <p className="lw-hint">
          The AI’s job: pick the move whose worst-case outcome is best. That is the minimax value of the
          move.
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------- 2 · game trees */

/** Real node counts per depth from an empty board (computed by running the search). */
export function BranchingDemo() {
  const perDepth = useMemo(() => countSearch(Array(9).fill(null) as Board, 'X', null, false), []);
  const [upTo, setUpTo] = useState(3);
  const max = Math.max(...perDepth.perDepth);
  const shown = perDepth.perDepth.slice(0, upTo + 1);
  const cumulative = shown.reduce((s, n) => s + n, 0);

  return (
    <div className="lw-col">
      <div className="lw-slider">
        <label htmlFor="branch-depth" className="setting-label">
          Look ahead {upTo} move{upTo === 1 ? '' : 's'}
        </label>
        <input
          id="branch-depth"
          className="range"
          type="range"
          min={0}
          max={perDepth.maxDepth}
          value={upTo}
          style={{ '--fill': `${(upTo / perDepth.maxDepth) * 100}%` } as CSSProperties}
          onChange={(e) => setUpTo(Number(e.target.value))}
        />
      </div>
      <div className="lw-bars" role="img" aria-label={`Positions per depth: ${perDepth.perDepth.join(', ')}`}>
        {perDepth.perDepth.map((n, d) => (
          <div key={d} className={'lw-bar-col' + (d <= upTo ? ' on' : '')}>
            <span className="lw-bar-num">{n.toLocaleString()}</span>
            <div className="lw-bar-track">
              <div className="lw-bar" style={{ height: `${Math.max((n / max) * 100, 2)}%` }} />
            </div>
            <span className="lw-bar-d">{d}</span>
          </div>
        ))}
      </div>
      <p className="lw-hint">
        Positions at each depth, from an empty board (depth 0 = start). Looking {upTo} move
        {upTo === 1 ? '' : 's'} ahead means examining <strong>{cumulative.toLocaleString()}</strong> positions;
        the whole game tree has <strong>{perDepth.nodes.toLocaleString()}</strong>.
      </p>
    </div>
  );
}

/* ------------------------------------------ 3 · MAX and MIN nodes (tree) */

/** Fully solved small tree. Click a node to see how it got its value. */
export function RolesDemo() {
  const full = useMemo(() => buildFullTree(LESSON_BOARD), []);
  const layout = useMemo(() => layoutTree(full), [full]);
  const [sel, setSel] = useState<FullNode | null>(null);

  const bestKeys = useMemo(() => {
    const s = new Set<string>();
    let n: FullNode | undefined = full;
    while (n) {
      s.add(n.key);
      n = n.bestIndex >= 0 ? n.children[n.bestIndex] : undefined;
    }
    return s;
  }, [full]);

  return (
    <div className="lw-col">
      <MiniTree
        layout={layout}
        statusOf={() => 'scored'}
        labelOf={(n) => n.value}
        bestKeys={bestKeys}
        selectedKey={sel?.key}
        onSelect={setSel}
        ariaLabel="Solved game tree. Violet squares are MAX nodes, teal squares are MIN nodes."
      />
      <div className="lw-legend">
        <span><i className="lw-sw lw-sw-max" /> MAX (AI to move)</span>
        <span><i className="lw-sw lw-sw-min" /> MIN (human to move)</span>
        <span><i className="lw-sw lw-sw-best" /> best line</span>
      </div>
      <p className="lw-callout">
        {!sel ? (
          'Click any node to inspect it.'
        ) : sel.terminal ? (
          <>
            <strong>Terminal position</strong> — the game is over here, so it is scored directly:{' '}
            {valueText(sel.value)}.
          </>
        ) : (
          <>
            <strong>{sel.isMax ? 'MAX' : 'MIN'} node</strong> with child values{' '}
            <code>[{sel.children.map((c) => fmtNum(c.value)).join(', ')}]</code>. It takes the{' '}
            {sel.isMax ? 'largest' : 'smallest'}, so its value is <strong>{fmtNum(sel.value)}</strong>.
          </>
        )}
      </p>
    </div>
  );
}

/* ----------------------------------------------- 4 · terminal evaluation */

const TERMINALS: { id: string; label: string; board: Board; why: string }[] = [
  { id: 'x', label: 'X wins', board: parseBoard('XXXOO____'), why: 'X completed the top row.' },
  { id: 'o', label: 'O wins', board: parseBoard('XXOXO_O__'), why: 'O completed the anti-diagonal.' },
  { id: 'd', label: 'Draw', board: parseBoard('XOXXOOOXX'), why: 'The board is full and nobody has three in a row.' },
  { id: 'u', label: 'Depth limit', board: LESSON_BOARD, why: 'The game is not over, but the search is not allowed to look any further.' },
];

/** Scores are produced by running the real engine on each board. */
export function TerminalDemo() {
  const [id, setId] = useState('x');
  const t = TERMINALS.find((x) => x.id === id) ?? TERMINALS[0];
  const isLimit = t.id === 'u';
  // Depth limit 0 scores the root immediately; null searches to the end.
  const scored = useMemo(() => buildMinimaxTree(t.board, 'O', isLimit ? 0 : null).tree.score ?? 0, [t, isLimit]);
  const truth = useMemo(() => (isLimit ? buildMinimaxTree(t.board, 'O', null).tree.score ?? 0 : null), [t, isLimit]);

  return (
    <div className="lw-col">
      <div className="segmented lw-tabs" role="tablist" aria-label="Terminal examples">
        {TERMINALS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === id}
            className={'segment' + (x.id === id ? ' segment-on' : '')}
            onClick={() => setId(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="lw-row">
        <BoardView board={t.board} label={t.label} />
        <div className="lw-text">
          <p>{t.why}</p>
          <p className="lw-score">
            Engine score: <strong>{fmtNum(scored)}</strong>
          </p>
          <p className="lw-hint">Rule: +1 if the AI (O) wins, −1 if the human (X) wins, 0 otherwise.</p>
          {isLimit && truth !== null && (
            <p className="lw-callout">
              With unlimited depth this very position is worth <strong>{fmtNum(truth)}</strong> to the AI, but
              a depth limit of 0 can only report <strong>{fmtNum(scored)}</strong>. A depth-limited score of 0
              means <em>“not decided yet”</em>, not necessarily “draw”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------- 5 · score propagation (reveal) */

export function LevelReveal() {
  const full = useMemo(() => buildFullTree(LESSON_BOARD), []);
  const layout = useMemo(() => layoutTree(full), [full]);
  const deepest = useMemo(() => maxDepthOf(full), [full]);
  const [from, setFrom] = useState(deepest + 1); // values are shown for depth >= from

  const sample = useMemo(() => {
    for (const it of layout.items) {
      if (it.node.depth === from && !it.node.terminal) return it.node;
    }
    return null;
  }, [layout, from]);

  const status = (n: FullNode): NodeStatus => (n.depth >= from ? 'scored' : 'pending');

  return (
    <div className="lw-col">
      <div className="lw-slider">
        <label htmlFor="reveal" className="setting-label">
          {from > deepest ? 'Nothing evaluated yet' : `Values known from depth ${deepest} up to depth ${from}`}
        </label>
        <input
          id="reveal"
          className="range"
          type="range"
          min={0}
          max={deepest + 1}
          value={deepest + 1 - from}
          style={{ '--fill': `${((deepest + 1 - from) / (deepest + 1)) * 100}%` } as CSSProperties}
          onChange={(e) => setFrom(deepest + 1 - Number(e.target.value))}
        />
      </div>
      <MiniTree
        layout={layout}
        statusOf={status}
        labelOf={(n) => (n.depth >= from ? n.value : null)}
        ariaLabel="Game tree with values revealed from the bottom up"
      />
      <p className="lw-callout">
        {from > deepest ? (
          'Drag the slider right: values flow up from the finished games at the bottom.'
        ) : sample ? (
          <>
            Depth {from} is a <strong>{sample.isMax ? 'MAX' : 'MIN'}</strong> level. For example one node here
            has children <code>[{sample.children.map((c) => fmtNum(c.value)).join(', ')}]</code> and takes the{' '}
            {sample.isMax ? 'largest' : 'smallest'}: <strong>{fmtNum(sample.value)}</strong>.
          </>
        ) : (
          <>Depth {from} contains only finished games, which are scored directly.</>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------- 6 / 7 · alpha-beta stepping demo */

interface SearchDemoProps {
  board?: Board;
  /** Start at the last step and show before/after counters (the pruning lesson). */
  summary?: boolean;
}

/** Steps through the real alpha-beta search of a small position, drawing the pruned branches too. */
export function SearchDemo({ board = LESSON_BOARD, summary = false }: SearchDemoProps) {
  const data = useMemo(() => {
    const full = buildFullTree(board);
    const real = buildMinimaxTree(board, 'O', null);
    const { byKey, keyById } = keyRealTree(real.tree);
    return { full, real, byKey, keyById, layout: layoutTree(full), nodes: indexNodes(real.tree) };
  }, [board]);
  const { full, real, byKey, keyById, layout, nodes } = data;
  const n = real.steps.length;
  const [index, setIndex] = useState(summary ? n - 1 : -1);

  const { visited, scored } = useMemo(() => {
    const v = new Set<number>();
    const s = new Set<number>();
    for (let i = 0; i <= index; i++) {
      const st = real.steps[i];
      v.add(st.nodeId);
      if (st.type === 'score') s.add(st.nodeId);
    }
    return { visited: v, scored: s };
  }, [real, index]);

  const step = index >= 0 ? real.steps[index] : null;
  const currentKey = step ? keyById.get(step.nodeId) ?? null : null;
  const finished = index === n - 1;

  const statusOf = (f: FullNode): NodeStatus => {
    const r = byKey.get(f.key);
    if (!r) return 'pruned';
    if (scored.has(r.id)) return 'scored';
    if (visited.has(r.id)) return 'active';
    return 'pending';
  };
  const labelOf = (f: FullNode) => {
    const r = byKey.get(f.key);
    return r && scored.has(r.id) ? r.score : null;
  };

  const bestKeys = useMemo(() => {
    if (!finished) return undefined;
    const s = new Set<string>();
    let cur: typeof real.tree | undefined = real.tree;
    while (cur) {
      s.add(keyById.get(cur.id)!);
      cur = cur.children.find((c) => c.id === cur!.bestChildId);
    }
    return s;
  }, [finished, real, keyById]);

  const exp = explainStep(index, { steps: real.steps, nodes, bestMove: real.bestMove });
  const total = countNodes(full);
  const explored = byKey.size;

  return (
    <div className="lw-col">
      <div className="lw-controls">
        <button className="btn" onClick={() => setIndex((i) => Math.max(-1, i - 1))} disabled={index < 0}>
          <Icon>
            <path d="M13 3l-7 5 7 5V3zM4 3h1.6v10H4V3z" />
          </Icon>
          Prev
        </button>
        <button className="btn btn-accent" onClick={() => setIndex((i) => Math.min(n - 1, i + 1))} disabled={finished}>
          <Icon>
            <path d="M3 3l7 5-7 5V3zm9 0h1.6v10H12V3z" />
          </Icon>
          Next
        </button>
        <button className="btn" onClick={() => setIndex(n - 1)} disabled={finished}>
          Run to end
        </button>
        <button className="btn btn-ghost" onClick={() => setIndex(-1)} disabled={index < 0}>
          Reset
        </button>
        <span className="progress-text">
          step {Math.max(index + 1, 0)} / {n}
        </span>
      </div>

      <div className="lw-bounds" aria-live="polite">
        <span className="lw-bound">
          <span className="lw-bound-name">α</span>
          <span className="lw-bound-val">{step ? fmtNum(step.alpha) : '−∞'}</span>
        </span>
        <span className="lw-bound">
          <span className="lw-bound-name">β</span>
          <span className="lw-bound-val">{step ? fmtNum(step.beta) : '+∞'}</span>
        </span>
        <span className={'lw-bound' + (step?.type === 'prune' ? ' lw-bound-cut' : '')}>
          <span className="lw-bound-name">β ≤ α ?</span>
          <span className="lw-bound-val">
            {step ? (step.beta <= step.alpha ? 'yes — cut' : 'no') : '—'}
          </span>
        </span>
      </div>

      <MiniTree
        layout={layout}
        statusOf={statusOf}
        labelOf={labelOf}
        currentKey={currentKey}
        bestKeys={bestKeys}
        ariaLabel="Alpha-beta search of a small position. Scissors mark branches that were never searched."
      />

      <div className="lw-legend">
        <span><i className="lw-sw lw-sw-max" /> MAX</span>
        <span><i className="lw-sw lw-sw-min" /> MIN</span>
        <span><i className="lw-sw lw-sw-cur" /> current node</span>
        <span><i className="lw-sw lw-sw-cut" /> ✂ never searched (pruned)</span>
      </div>

      <div className="lw-callout">
        <strong>{exp.title}</strong>
        {exp.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {summary && finished && (
        <p className="lw-score">
          Alpha-Beta looked at <strong>{explored}</strong> of the tree’s <strong>{total}</strong> nodes —{' '}
          <strong>{total - explored}</strong> were pruned ({(((total - explored) / total) * 100).toFixed(0)}%) and the
          decision is the same as full minimax: <strong>{cellName(real.bestMove)}</strong>.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------ 8 · complexity & limitations */

interface Measured {
  mm: number;
  ab: number;
  pruned: number;
}

export function ComplexityDemo() {
  const [m, setM] = useState<Measured | null>(null);
  const [busy, setBusy] = useState(false);

  const measure = () => {
    setBusy(true);
    window.setTimeout(() => {
      const empty = Array(9).fill(null) as Board;
      const mm = countSearch(empty, 'X', null, false);
      const ab = countSearch(empty, 'X', null, true);
      setM({ mm: mm.nodes, ab: ab.nodes, pruned: ab.pruned });
      setBusy(false);
    }, 30);
  };

  return (
    <div className="lw-col">
      <div className="lw-formula">
        <code>nodes ≈ b<sup>d</sup></code>
        <span>
          b = moves per position, d = depth. Alpha-Beta with perfect move ordering needs about{' '}
          <code>b<sup>d/2</sup></code>.
        </span>
      </div>
      <div className="lw-controls">
        <button className="btn btn-primary" onClick={measure} disabled={busy}>
          {busy ? 'Measuring…' : 'Measure on an empty board'}
        </button>
        {m && (
          <span className="lw-score">
            Minimax: <strong>{m.mm.toLocaleString()}</strong> nodes · Alpha-Beta: <strong>{m.ab.toLocaleString()}</strong>{' '}
            nodes ({((1 - m.ab / m.mm) * 100).toFixed(1)}% fewer)
          </span>
        )}
      </div>
      <ul className="lw-list">
        <li>
          <strong>Exponential growth.</strong> Tic-Tac-Toe is tiny (about half a million positions). Chess has more
          positions than a computer can ever enumerate, so real engines must stop early.
        </li>
        <li>
          <strong>Depth limits need an evaluation function.</strong> This app scores unfinished boards 0, so a
          shallow search can miss a forced win or loss that lies deeper.
        </li>
        <li>
          <strong>Move ordering matters.</strong> Alpha-Beta prunes most when the best moves are tried first; this
          app tries cells in a fixed order.
        </li>
        <li>
          <strong>It assumes a perfect opponent.</strong> Minimax maximises the worst case, so it can be overly
          cautious against a human who makes mistakes.
        </li>
        <li>
          <strong>Perfect information only.</strong> The basic algorithm needs a deterministic game where both
          players see everything (no dice, no hidden cards).
        </li>
      </ul>
    </div>
  );
}
