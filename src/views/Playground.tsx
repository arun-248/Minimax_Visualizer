import { StatsBar } from '../components/StatsBar';
import { StatusBar } from '../components/StatusBar';
import { Board } from '../components/Board';
import { Controls } from '../components/Controls';
import { TreeVisualizer } from '../components/TreeVisualizer';
import { CodeDebugger } from '../components/CodeDebugger';

/** 01 · Playground: play against the AI and watch its live search tree. */
export function Playground() {
  return (
    <div className="view playground">
      <StatsBar />
      <div className="play-grid">
        <aside className="left-panel" aria-label="Game and controls">
          <StatusBar />
          <Board />
          <Controls />
          <div className="minimax-info">
            <h2 className="group-title">How it works</h2>
            <p>
              <strong>Minimax</strong> is a decision-making algorithm that finds
              the optimal move by simulating all possible game states, assuming
              both players play perfectly.{' '}
              <a
                href="https://en.wikipedia.org/wiki/Minimax"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
            </p>
          </div>
        </aside>
        <section className="stage" aria-label="Decision tree">
          <div className="stage-tree">
            <TreeVisualizer />
          </div>
          <CodeDebugger variant="drawer" />
        </section>
      </div>
    </div>
  );
}
