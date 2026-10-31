import { useState } from 'react';
import { useStore } from '../store';
import { checkWinner } from '../minimax';
import type { Board } from '../types';
import { Icon } from '../components/Icon';
import { BarPair, DepthChart } from '../components/Charts';
import { POSITIONS, cellName } from '../lab/positions';
import { timedSearch, verifyAgainstEngine, type Check, type SearchResult } from '../lab/search';

const CURRENT_ID = 'current';

const DEPTHS: { value: string; label: string }[] = [
  { value: '3', label: 'Depth 3' },
  { value: '4', label: 'Depth 4' },
  { value: '5', label: 'Depth 5' },
  { value: '6', label: 'Depth 6' },
  { value: 'full', label: 'Full depth' },
];

interface Comparison {
  positionLabel: string;
  board: Board;
  depthLimit: number | null;
  mm: SearchResult;
  ab: SearchResult;
  checks: Check[];
}

function runComparison(
  board: Board,
  positionLabel: string,
  depthLimit: number | null,
): Comparison | { error: string } {
  if (checkWinner(board) !== null) {
    return { error: 'That board is already finished (a win or a draw), so there is nothing to search.' };
  }
  const mm = timedSearch(board, 'O', depthLimit, false);
  const ab = timedSearch(board, 'O', depthLimit, true);
  const checks = verifyAgainstEngine(board, 'O', depthLimit, mm, ab);
  return { positionLabel, board, depthLimit, mm, ab, checks };
}

const fmtMs = (ms: number) =>
  ms < 0.001 ? '<1 µs' : ms < 1 ? `${(ms * 1000).toFixed(1)} µs` : ms < 10 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(1)} ms`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtScore = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

function MiniBoard({ board }: { board: Board }) {
  return (
    <div className="mini-board" aria-hidden="true">
      {board.map((c, i) => (
        <span key={i} className={'mb-cell' + (c ? ` mb-${c}` : '')}>
          {c ?? ''}
        </span>
      ))}
    </div>
  );
}

/** 03 · Compare Algorithms: plain Minimax vs Alpha-Beta on the same position. */
export function Compare() {
  const game = useStore((s) => s.game);
  const depthLimit = useStore((s) => s.depthLimit);
  const [positionId, setPositionId] = useState(POSITIONS[0].id);
  const [depthValue, setDepthValue] = useState<string>('full');
  const [result, setResult] = useState<Comparison | { error: string } | null>(() =>
    runComparison(POSITIONS[0].board, POSITIONS[0].label, null),
  );
  const [running, setRunning] = useState(false);

  const run = () => {
    const board = positionId === CURRENT_ID ? game.board : POSITIONS.find((p) => p.id === positionId)!.board;
    const label =
      positionId === CURRENT_ID ? 'Current game board' : POSITIONS.find((p) => p.id === positionId)!.label;
    const limit = depthValue === 'full' ? null : Number(depthValue);
    setRunning(true);
    // Let the "Running…" state paint before the (synchronous) search blocks the thread.
    window.setTimeout(() => {
      setResult(runComparison(board, label, limit));
      setRunning(false);
    }, 30);
  };

  const ok = result && !('error' in result) ? result : null;
  const failed = ok ? ok.checks.filter((c) => !c.ok) : [];
  const saved = ok ? ok.mm.nodes - ok.ab.nodes : 0;
  const savedPct = ok && ok.mm.nodes > 0 ? (saved / ok.mm.nodes) * 100 : 0;
  const speedup = ok && ok.ab.timeMs > 0 ? ok.mm.timeMs / ok.ab.timeMs : 0;

  return (
    <div className="view">
      <div className="page-scroll">
        <div className="page-inner">
          <div className="page-head">
            <p className="eyebrow">03 · Compare Algorithms</p>
            <h2>Minimax vs Alpha-Beta pruning</h2>
            <p>
              Both algorithms search the same position with the same depth limit, move order (cells 1 → 9)
              and scoring (+1 AI win, −1 human win, 0 otherwise). Everything below is measured by actually
              running them in your browser.
            </p>
          </div>

          <div className="toolbar card">
            <div className="toolbar-field">
              <label htmlFor="cmp-pos" className="setting-label">
                Position (AI = O to move)
              </label>
              <select
                id="cmp-pos"
                className="select"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
              >
                {POSITIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.note}
                  </option>
                ))}
                <option value={CURRENT_ID}>Current game board (from the Playground)</option>
              </select>
            </div>
            <div className="toolbar-field">
              <label htmlFor="cmp-depth" className="setting-label">
                Search depth
              </label>
              <select
                id="cmp-depth"
                className="select"
                value={depthValue}
                onChange={(e) => setDepthValue(e.target.value)}
              >
                {DEPTHS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                    {d.value === 'full' ? ' (exact)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={run} disabled={running}>
              <Icon>
                <path d="M4 2.8v10.4a.6.6 0 00.92.5l8.2-5.2a.6.6 0 000-1L4.92 2.3a.6.6 0 00-.92.5z" />
              </Icon>
              {running ? 'Running…' : 'Run comparison'}
            </button>
            <p className="toolbar-note">
              The Playground depth is {depthLimit === null ? 'full' : depthLimit}; this page has its own
              depth so you can compare freely.
            </p>
          </div>

          {result && 'error' in result && (
            <div className="banner banner-warn" role="alert">
              {result.error}
            </div>
          )}

          {ok && (
            <>
              {failed.length > 0 && (
                <div className="banner banner-bad" role="alert">
                  <strong>Verification warning.</strong> {failed.length} check
                  {failed.length === 1 ? '' : 's'} disagreed with the app’s engine. The numbers below may
                  not be trustworthy:
                  <ul>
                    {failed.map((c) => (
                      <li key={c.label}>
                        {c.label} — {c.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="summary-grid">
                <div className="card summary summary-position">
                  <MiniBoard board={ok.board} />
                  <div>
                    <span className="stat-label">Position</span>
                    <p className="summary-text">{ok.positionLabel}</p>
                    <p className="stat-sub">
                      Depth {ok.depthLimit === null ? 'full' : ok.depthLimit} · AI (O) to move
                    </p>
                  </div>
                </div>
                <div className="card summary">
                  <span className="stat-label">Decision</span>
                  <p className="summary-big">{cellName(ok.ab.bestMove)}</p>
                  <p className="stat-sub">
                    score {fmtScore(ok.ab.score)} ·{' '}
                    {ok.mm.bestMove === ok.ab.bestMove && ok.mm.score === ok.ab.score
                      ? 'identical for both algorithms'
                      : 'ALGORITHMS DISAGREE'}
                  </p>
                </div>
                <div className="card summary">
                  <span className="stat-label">Nodes avoided</span>
                  <p className="summary-big summary-amber">{fmtInt(saved)}</p>
                  <p className="stat-sub">
                    {savedPct.toFixed(1)}% fewer than Minimax ({fmtInt(ok.mm.nodes)} → {fmtInt(ok.ab.nodes)})
                  </p>
                </div>
                <div className="card summary">
                  <span className="stat-label">Time ratio</span>
                  <p className="summary-big">{speedup > 0 ? `${speedup.toFixed(1)}×` : '—'}</p>
                  <p className="stat-sub">Minimax time ÷ Alpha-Beta time (browser timing is noisy)</p>
                </div>
              </div>

              <section className="card table-card" aria-label="Results table">
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col" className="col-a">
                        Minimax
                      </th>
                      <th scope="col" className="col-b">
                        Alpha-Beta
                      </th>
                      <th scope="col">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Nodes explored</th>
                      <td>{fmtInt(ok.mm.nodes)}</td>
                      <td>{fmtInt(ok.ab.nodes)}</td>
                      <td>−{fmtInt(saved)} ({savedPct.toFixed(1)}%)</td>
                    </tr>
                    <tr>
                      <th scope="row">Terminal states evaluated</th>
                      <td>{fmtInt(ok.mm.terminal)}</td>
                      <td>{fmtInt(ok.ab.terminal)}</td>
                      <td>−{fmtInt(ok.mm.terminal - ok.ab.terminal)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Branches pruned</th>
                      <td>{fmtInt(ok.mm.pruned)}</td>
                      <td>{fmtInt(ok.ab.pruned)}</td>
                      <td>+{fmtInt(ok.ab.pruned)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Cutoffs (β ≤ α)</th>
                      <td>{fmtInt(ok.mm.cutoffs)}</td>
                      <td>{fmtInt(ok.ab.cutoffs)}</td>
                      <td>+{fmtInt(ok.ab.cutoffs)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Best move</th>
                      <td>{cellName(ok.mm.bestMove)}</td>
                      <td>{cellName(ok.ab.bestMove)}</td>
                      <td>{ok.mm.bestMove === ok.ab.bestMove ? 'same ✓' : 'different ✗'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Score of best move</th>
                      <td>{fmtScore(ok.mm.score)}</td>
                      <td>{fmtScore(ok.ab.score)}</td>
                      <td>{ok.mm.score === ok.ab.score ? 'same ✓' : 'different ✗'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Execution time (mean)</th>
                      <td>{fmtMs(ok.mm.timeMs)}</td>
                      <td>{fmtMs(ok.ab.timeMs)}</td>
                      <td>
                        {fmtMs(Math.abs(ok.mm.timeMs - ok.ab.timeMs))}{' '}
                        {ok.mm.timeMs >= ok.ab.timeMs ? 'faster' : 'slower'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="table-note">
                  Time is the mean of {ok.mm.reps} (Minimax) and {ok.ab.reps} (Alpha-Beta) repeated runs after a
                  warm-up run. Node and branch counts are exact and repeatable; times vary a little between
                  runs and machines.
                </p>
              </section>

              <div className="chart-grid-2">
                <BarPair
                  title="Nodes explored"
                  a={{ label: 'Minimax', value: ok.mm.nodes }}
                  b={{ label: 'Alpha-Beta', value: ok.ab.nodes }}
                  note={`Alpha-Beta visited ${(100 - savedPct).toFixed(1)}% of the nodes Minimax needed.`}
                />
                <BarPair
                  title="Terminal states evaluated"
                  a={{ label: 'Minimax', value: ok.mm.terminal }}
                  b={{ label: 'Alpha-Beta', value: ok.ab.terminal }}
                  note={
                    ok.depthLimit === null
                      ? 'Wins, losses and draws scored directly.'
                      : 'Includes unfinished positions cut off by the depth limit (scored 0).'
                  }
                />
                <BarPair
                  title="Execution time (mean of repeated runs)"
                  a={{ label: 'Minimax', value: ok.mm.timeMs }}
                  b={{ label: 'Alpha-Beta', value: ok.ab.timeMs }}
                  format={fmtMs}
                />
                <DepthChart
                  a={ok.mm.perDepth}
                  b={ok.ab.perDepth}
                  aLabel="Minimax"
                  bLabel="Alpha-Beta"
                />
              </div>

              <section className="card insight" aria-label="What this shows">
                <h3 className="group-title">What this shows</h3>
                <ul>
                  <li>
                    <strong>Same answer, less work.</strong> Both algorithms chose{' '}
                    {cellName(ok.ab.bestMove)} with score {fmtScore(ok.ab.score)}. Alpha-Beta reached it
                    after {fmtInt(ok.ab.nodes)} nodes instead of {fmtInt(ok.mm.nodes)}.
                  </li>
                  <li>
                    <strong>Pruning never changes the result.</strong> A branch is skipped only when it
                    cannot beat a move already found, so the decision is provably identical.
                  </li>
                  <li>
                    <strong>The saving depends on move order.</strong> This lab always tries cells 1 → 9. If
                    the best move happened to be tried first, far more branches would be cut; if it were
                    tried last, almost none would.
                  </li>
                  {ok.depthLimit !== null && (
                    <li>
                      <strong>Depth-limited scores are estimates.</strong> At depth {ok.depthLimit} unfinished
                      boards are scored 0, so a score of 0 can mean “draw” or “not decided yet”.
                    </li>
                  )}
                </ul>
              </section>

              <section className="card checks" aria-label="Verification">
                <h3 className="group-title">Verification against the app’s engine</h3>
                <ul>
                  {ok.checks.map((c) => (
                    <li key={c.label} className={c.ok ? 'check-ok' : 'check-bad'}>
                      <span className="check-mark" aria-hidden="true">
                        {c.ok ? '✓' : '✗'}
                      </span>
                      <span className="check-label">{c.label}</span>
                      <span className="check-detail">{c.detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
