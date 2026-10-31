import { useState, type ReactNode } from 'react';
import {
  AdversaryDemo,
  BranchingDemo,
  RolesDemo,
  TerminalDemo,
  LevelReveal,
  SearchDemo,
  ComplexityDemo,
} from '../components/LearnWidgets';

interface Lesson {
  id: string;
  title: string;
  blurb: string;
  body: ReactNode;
  demo: ReactNode;
}

const LESSONS: Lesson[] = [
  {
    id: 'adversarial',
    title: 'Adversarial search',
    blurb: 'Two players, opposite goals',
    body: (
      <>
        <p>
          In a game like Tic-Tac-Toe, your best move depends on what your opponent will do next, and your
          opponent is trying to <em>stop</em> you. This is <strong>adversarial search</strong>: planning when
          another agent works against you.
        </p>
        <p>
          The usual assumption is that the opponent plays <strong>optimally</strong>. Then the value of a move is
          the best result you can still guarantee against the opponent’s best defence.
        </p>
      </>
    ),
    demo: <AdversaryDemo />,
  },
  {
    id: 'trees',
    title: 'Game trees',
    blurb: 'Every possible future as a tree',
    body: (
      <>
        <p>
          Picture each position as a <strong>node</strong>. Every legal move leads to a child node: the position
          after that move. The starting position is the <strong>root</strong>; finished games are the{' '}
          <strong>leaves</strong>.
        </p>
        <p>
          Minimax looks at this tree. The catch is size: the number of positions multiplies at every move, which is
          why the search depth matters so much.
        </p>
      </>
    ),
    demo: <BranchingDemo />,
  },
  {
    id: 'max-min',
    title: 'MAX and MIN nodes',
    blurb: 'Whose turn is it?',
    body: (
      <>
        <p>
          The AI wants a high score, so nodes where the AI chooses are <strong>MAX</strong> nodes: they pick the
          child with the <em>largest</em> value. Nodes where the human chooses are <strong>MIN</strong> nodes: the
          human is assumed to pick the child with the <em>smallest</em> value (worst for the AI).
        </p>
        <p>MAX and MIN levels alternate, because the players alternate.</p>
      </>
    ),
    demo: <RolesDemo />,
  },
  {
    id: 'terminal',
    title: 'Terminal state evaluation',
    blurb: 'Turning a finished game into a number',
    body: (
      <>
        <p>
          The search needs numbers to compare. When a game is over, the position is <strong>terminal</strong> and
          gets a score: <strong>+1</strong> if the AI wins, <strong>−1</strong> if the human wins, and{' '}
          <strong>0</strong> for a draw.
        </p>
        <p>
          If the search is stopped early by a depth limit, unfinished positions are also scored 0 in this app. That
          keeps the code simple, but it means 0 can hide a position that is really winning or losing.
        </p>
      </>
    ),
    demo: <TerminalDemo />,
  },
  {
    id: 'propagation',
    title: 'Minimax score propagation',
    blurb: 'Values flow up from the leaves',
    body: (
      <>
        <p>
          Scores start at the leaves and are <strong>backed up</strong> level by level. A MIN node keeps the
          smallest of its children, a MAX node the largest. When the values reach the root, the AI plays the move
          whose child has the best value.
        </p>
      </>
    ),
    demo: <LevelReveal />,
  },
  {
    id: 'alpha-beta',
    title: 'Alpha and beta values',
    blurb: 'Bounds that travel down the tree',
    body: (
      <>
        <p>
          While searching, each node carries a window <strong>[α, β]</strong>.{' '}
          <strong>α (alpha)</strong> is the best score MAX can already guarantee somewhere above.{' '}
          <strong>β (beta)</strong> is the best (lowest) score MIN can already guarantee.
        </p>
        <p>
          The window starts at [−∞, +∞] and narrows as results come back. Step through the real search below and
          watch α rise at MAX nodes and β fall at MIN nodes.
        </p>
      </>
    ),
    demo: <SearchDemo />,
  },
  {
    id: 'pruning',
    title: 'Alpha-Beta pruning',
    blurb: 'Skipping branches that cannot matter',
    body: (
      <>
        <p>
          If a node’s window closes (<strong>β ≤ α</strong>), the player above would never let the game reach it,
          so its remaining children are <strong>pruned</strong>: never searched. The scissors ✂ below mark exactly
          the positions that Alpha-Beta skipped.
        </p>
        <p>
          Pruning never changes the answer. It only removes work that could not have changed it.
        </p>
      </>
    ),
    demo: <SearchDemo summary />,
  },
  {
    id: 'limits',
    title: 'Complexity and limitations',
    blurb: 'Why real games need more',
    body: (
      <>
        <p>
          Minimax examines roughly <strong>b<sup>d</sup></strong> positions. Alpha-Beta can reduce that a lot, but
          not enough for big games, which is why practical engines add depth limits, evaluation functions, move
          ordering and other tricks.
        </p>
      </>
    ),
    demo: <ComplexityDemo />,
  },
];

/** 04 · Learn Minimax: guided tutorial with interactive examples driven by the real engine. */
export function Learn() {
  const [active, setActive] = useState(LESSONS[0].id);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(`lesson-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="view">
      <div className="page-scroll">
        <div className="learn-layout">
          <nav className="learn-toc card" aria-label="Lessons">
            <p className="eyebrow">04 · Learn Minimax</p>
            <ol>
              {LESSONS.map((l, i) => (
                <li key={l.id}>
                  <button
                    className={'toc-item' + (active === l.id ? ' toc-on' : '')}
                    onClick={() => go(l.id)}
                    aria-current={active === l.id ? 'true' : undefined}
                  >
                    <span className="toc-num">{i + 1}</span>
                    <span className="toc-text">
                      <span className="toc-title">{l.title}</span>
                      <span className="toc-blurb">{l.blurb}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="learn-body">
            <div className="page-head">
              <p className="eyebrow">Guided tutorial</p>
              <h2>How Minimax and Alpha-Beta pruning think</h2>
              <p>
                Eight short lessons. Every example below runs the same search code as the game, so the numbers you
                see are real, not illustrations.
              </p>
            </div>
            {LESSONS.map((l, i) => (
              <section key={l.id} id={`lesson-${l.id}`} className="card lesson" aria-labelledby={`h-${l.id}`}>
                <header className="lesson-head">
                  <span className="lesson-num">{i + 1}</span>
                  <h3 id={`h-${l.id}`}>{l.title}</h3>
                </header>
                <div className="lesson-text">{l.body}</div>
                <div className="lesson-demo">{l.demo}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
