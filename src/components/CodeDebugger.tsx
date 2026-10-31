import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { CODE_LINES, getHighlightedLineId } from '../codeLines';

const STEP_LABELS: Record<string, string> = {
  visit: 'Visit',
  score: 'Score',
  backpropagate: 'Backpropagate',
  prune: 'Prune',
};

function formatNum(n: number): string {
  if (n === Infinity) return '+∞';
  if (n === -Infinity) return '-∞';
  return String(n);
}

/* Tiny pseudocode highlighter: keywords, function calls, α/β, ∞ and operators. */
const TOKEN_RE =
  /(\b(?:function|if|for|return|break)\b)|(\b(?:explore|isTerminal|evaluate|makeMove)\b(?=\())|([αβ])|([-+]?∞)|(≤|[=?:])|(\b(?:node|child|cell|score|bestScore|isMax)\b)/g;
const TOKEN_CLASSES = ['tok-kw', 'tok-fn', 'tok-greek', 'tok-num', 'tok-op', 'tok-var'];

function highlight(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const group = m.slice(1).findIndex((g) => g !== undefined);
    out.push(
      <span key={key++} className={TOKEN_CLASSES[group]}>
        {m[0]}
      </span>,
    );
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface CodeDebuggerProps {
  /**
   * `drawer`: collapsible strip under the tree (Playground).
   * `panel`: always-open card that fills its container (Algorithm Explorer).
   */
  variant: 'drawer' | 'panel';
}

/** Pseudocode debugger. Never floats over the tree: it occupies its own space. */
export function CodeDebugger({ variant }: CodeDebuggerProps) {
  const mode = useStore((s) => s.mode);
  const steps = useStore((s) => s.steps);
  const currentStepIndex = useStore((s) => s.currentStepIndex);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const isDrawer = variant === 'drawer';
  const expanded = !isDrawer || open;

  const currentStep = currentStepIndex >= 0 && currentStepIndex < steps.length
    ? steps[currentStepIndex]
    : null;

  const highlightedLineId = currentStep ? getHighlightedLineId(currentStep) : null;
  const activeLineIndex = CODE_LINES.findIndex((l) => l.id === highlightedLineId);
  const activeLine = activeLineIndex >= 0 ? CODE_LINES[activeLineIndex] : null;

  useEffect(() => {
    // Scroll only the code pane, never an ancestor container.
    const container = codeRef.current;
    const line = activeLineRef.current;
    if (container && line) {
      container.scrollTo({
        top: line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [highlightedLineId, currentStepIndex, expanded]);

  const isIdle = mode === 'idle' || steps.length === 0;

  return (
    <section
      className={`debugger debugger-${variant}` + (expanded ? ' is-open' : '')}
      aria-label="Pseudocode debugger"
    >
      <header className="debugger-header">
        <span className="debugger-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="debugger-title">explore()</span>
        <span className="debugger-badge">Debugger</span>
        {isDrawer && !expanded && (
          <span className="debugger-peek" aria-live="off">
            {activeLine
              ? `line ${activeLineIndex + 1} · ${activeLine.text.trim()}`
              : 'Activates during a search'}
          </span>
        )}
        {isDrawer && (
          <button
            className="debugger-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Collapse debugger' : 'Expand debugger'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d={open ? 'M3 5l4 4 4-4' : 'M3 9l4-4 4 4'}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </header>

      {expanded && (
        <div className="debugger-body">
          {isIdle ? (
            <div className="debugger-body-empty">
              <span className="debugger-placeholder">Activates during visualization</span>
            </div>
          ) : (
            <>
              <div className="debugger-code" ref={codeRef}>
                {CODE_LINES.map((line, i) => {
                  const isActive = highlightedLineId === line.id;
                  const isBlank = line.text === '';
                  return (
                    <div
                      key={line.id}
                      ref={isActive ? activeLineRef : undefined}
                      className={
                        'debugger-line' +
                        (isActive ? ' debugger-line-active' : '') +
                        (isBlank ? ' debugger-line-blank' : '')
                      }
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <span className="debugger-lineno">{isBlank ? '' : i + 1}</span>
                      <span className="debugger-marker" aria-hidden="true">{isActive ? '▶' : ' '}</span>
                      <span
                        className={
                          'debugger-text' +
                          (line.kind === 'keyword' ? ' debugger-keyword' : '') +
                          (line.kind === 'comment' ? ' debugger-comment' : '')
                        }
                        style={{ paddingLeft: line.indent * 16 }}
                      >
                        {line.kind === 'comment' ? line.text : highlight(line.text)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="debugger-context">
                {currentStep ? (
                  <>
                    <span className={'debugger-step-type debugger-step-' + currentStep.type}>
                      {STEP_LABELS[currentStep.type]}
                    </span>
                    <span className="debugger-detail">depth: {currentStep.depth}</span>
                    <span className="debugger-detail">{currentStep.isMaximizing ? 'MAX' : 'MIN'}</span>
                    <span className="debugger-detail">α: {formatNum(currentStep.alpha)}</span>
                    <span className="debugger-detail">β: {formatNum(currentStep.beta)}</span>
                    {currentStep.score !== null && (
                      <span className="debugger-detail debugger-score">
                        score: {currentStep.score}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="debugger-detail">Press Next or Play to begin</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
