import type { KeyboardEvent } from 'react';
import { VIEWS, type ViewId } from '../nav';

interface HeaderProps {
  view: ViewId;
  onChange: (view: ViewId) => void;
}

export function Header({ view, onChange }: HeaderProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = VIEWS.findIndex((v) => v.id === view);
    const next = VIEWS[(i + (e.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
    e.preventDefault();
  };

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path
              d="M13 6v6M13 12l-6 5M13 12l6 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="13" cy="5" r="3" fill="var(--violet)" />
            <circle cx="6" cy="19" r="3" fill="var(--teal)" />
            <circle cx="20" cy="19" r="3" fill="var(--teal)" />
          </svg>
        </span>
        <div className="brand-text">
          <h1>
  Minimax <span className="brand-accent">Visualizer</span>
</h1>
          <p className="app-subtitle">Interactive AI Decision Explorer</p>
        </div>
      </div>

      <nav className="main-nav" aria-label="Sections">
        <div className="tablist" role="tablist" onKeyDown={onKeyDown}>
          {VIEWS.map((v) => {
            const selected = v.id === view;
            return (
              <button
                key={v.id}
                id={`tab-${v.id}`}
                role="tab"
                aria-selected={selected}
                aria-controls="view-panel"
                tabIndex={selected ? 0 : -1}
                className={'tab' + (selected ? ' tab-on' : '')}
                onClick={() => onChange(v.id)}
              >
                <span className="tab-num">{v.num}</span>
                <span className="tab-text">
                  <span className="tab-label">{v.label}</span>
                  <span className="tab-sub">{v.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="header-right">
        <span className="course-chip">Foundations of AI</span>
        <a
          className="github-link"
          href="https://github.com/pyaephyowinn/minimax-visualizer"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
