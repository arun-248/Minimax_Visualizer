import { useMemo } from 'react';
import { useStore } from '../store';
import { indexNodes } from '../lab/stats';
import { cellName } from '../lab/positions';
import { explainStep, fmtNum, rootCandidates, PHASES } from '../lab/explain';

/**
 * "AI reasoning": plain-English account of the step currently selected on the timeline.
 * Text is generated from the real step + tree (see lab/explain.ts), never canned.
 */
export function ReasoningPanel() {
  const tree = useStore((s) => s.tree);
  const steps = useStore((s) => s.steps);
  const currentStepIndex = useStore((s) => s.currentStepIndex);
  const bestMove = useStore((s) => s.bestMove);
  const visited = useStore((s) => s.visitedNodeIds);
  const scored = useStore((s) => s.scoredNodeIds);
  const mode = useStore((s) => s.mode);

  const nodes = useMemo(() => (tree ? indexNodes(tree) : null), [tree]);

  if (!tree || !nodes || steps.length === 0) {
    return (
      <section className="card reasoning" aria-label="AI reasoning">
        <h2 className="group-title">AI reasoning</h2>
        <p className="reasoning-empty">Run a search to see the AI explain each step.</p>
      </section>
    );
  }

  const index = Math.min(currentStepIndex, steps.length - 1);
  const step = index >= 0 ? steps[index] : null;
  const exp = explainStep(index, { steps, nodes, bestMove });
  const phase = PHASES.find((p) => p.id === exp.phase);
  const node = step ? nodes.get(step.nodeId) : null;
  const candidates = rootCandidates(tree, visited, scored, mode === 'done');

  return (
    <section className="card reasoning" aria-label="AI reasoning">
      <div className="group-head">
        <h2 className="group-title">AI reasoning</h2>
        <span className="progress-text">
          Step {Math.max(index + 1, 0)} / {steps.length}
        </span>
      </div>

      {phase && <span className={`phase-chip phase-${phase.id}`}>{phase.label}</span>}
      <h3 className="reasoning-title">{exp.title}</h3>
      {step && (
        <dl className="facts">
          <div>
            <dt>Node</dt>
            <dd>#{step.nodeId}</dd>
          </div>
          <div>
            <dt>Player</dt>
            <dd className={step.isMaximizing ? 'fact-max' : 'fact-min'}>
              {step.isMaximizing ? 'MAX' : 'MIN'}
            </dd>
          </div>
          <div>
            <dt>Depth</dt>
            <dd>{step.depth}</dd>
          </div>
          <div>
            <dt className="dt-greek">α</dt>
            <dd>{fmtNum(step.alpha)}</dd>
          </div>
          <div>
            <dt className="dt-greek">β</dt>
            <dd>{fmtNum(step.beta)}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{step.score === null ? '—' : fmtNum(step.score)}</dd>
          </div>
        </dl>
      )}
      {node && node.move !== null && (
        <p className="fact-line">
          Reached by playing <strong>{cellName(node.move)}</strong>
        </p>
      )}

      <div className="reasoning-body" aria-live="polite">
        {exp.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="candidates">
        <h3 className="group-title">Root candidates (AI’s possible moves)</h3>
        <ul>
          {candidates.map((c) => (
            <li key={c.cell} className={'cand cand-' + c.state + (c.isBest ? ' cand-best' : '')}>
              <span className="cand-cell">{cellName(c.cell)}</span>
              <span className="cand-score">
                {c.state === 'scored' && c.score !== null
                  ? `${c.bound}${fmtNum(c.score)}`
                  : c.state === 'searching'
                    ? 'searching…'
                    : 'queued'}
              </span>
              {c.isBest && <span className="cand-tag">chosen</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
