import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { Header } from './components/Header';
import { Playground } from './views/Playground';
import { Explorer } from './views/Explorer';
import { Compare } from './views/Compare';
import { Learn } from './views/Learn';
import { Quiz } from './views/Quiz';
import type { ViewId } from './nav';
import './App.css';
import './lab.css';

function App() {
  const mode = useStore((s) => s.mode);
  const speed = useStore((s) => s.speed);
  const vizStep = useStore((s) => s.vizStep);
  const timerRef = useRef<number | null>(null);
  const [view, setView] = useState<ViewId>('playground');

  // Playback timer lives at the top so a running search keeps going across tabs.
  useEffect(() => {
    if (mode === 'playing') {
      timerRef.current = window.setInterval(() => {
        vizStep();
      }, speed);
      return () => {
        if (timerRef.current !== null) clearInterval(timerRef.current);
      };
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [mode, speed, vizStep]);

  return (
    <div className="app">
      <Header view={view} onChange={setView} />
      <main className="app-main" id="view-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {view === 'playground' && <Playground />}
        {view === 'explorer' && <Explorer />}
        {view === 'compare' && <Compare />}
        {view === 'learn' && <Learn />}
        {view === 'quiz' && <Quiz />}
      </main>
    </div>
  );
}

export default App;
