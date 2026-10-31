import { useMemo, useState } from 'react';
import type { Board } from '../types';
import { Icon } from '../components/Icon';
import { buildQuiz, type Question } from '../lab/quiz';

interface Answer {
  correct: boolean;
  picked: number[];
}

function QuizBoard({
  board,
  interactive,
  selected,
  answered,
  correctCells,
  marks,
  onCell,
}: {
  board: Board;
  interactive: boolean;
  selected: number[];
  answered: boolean;
  correctCells: number[];
  marks: number[];
  onCell: (i: number) => void;
}) {
  return (
    <div className="lw-board quiz-board" role="group" aria-label="Question board">
      {board.map((c, i) => {
        const empty = c === null;
        const isSel = selected.includes(i);
        const isRight = answered && correctCells.includes(i);
        const isWrong = answered && isSel && !correctCells.includes(i);
        const cls =
          'lw-cell' +
          (c ? ` lw-${c}` : '') +
          (empty && interactive ? ' lw-open' : '') +
          (isSel && !answered ? ' qb-sel' : '') +
          (isRight ? ' qb-ok' : '') +
          (isWrong ? ' qb-bad' : '');
        const dot = marks.includes(i) ? <span className="qb-dot" aria-label="tried before the cutoff" /> : null;
        if (empty && interactive) {
          return (
            <button
              key={i}
              className={cls}
              onClick={() => onCell(i)}
              aria-pressed={isSel}
              aria-label={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`}
            >
              {dot}
            </button>
          );
        }
        return (
          <span
            key={i}
            className={cls}
            aria-label={empty ? `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, empty` : undefined}
          >
            {c ?? dot}
          </span>
        );
      })}
    </div>
  );
}

/** 05 · Knowledge Check: questions generated from the real engine. */
export function Quiz() {
  const questions = useMemo<Question[]>(() => buildQuiz(), []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [draft, setDraft] = useState<number[]>([]); // multi-select in progress

  const done = index >= questions.length;
  const q = done ? null : questions[index];
  const answer = q ? answers[index] : undefined;
  const answered = !!answer;
  const score = answers.filter((a) => a.correct).length;

  const submit = (picked: number[], correct: boolean) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = { correct, picked };
      return next;
    });
  };

  const next = () => {
    setDraft([]);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setAnswers([]);
    setDraft([]);
    setIndex(0);
  };

  const byTopic = useMemo(() => {
    const m = new Map<string, { right: number; total: number }>();
    questions.forEach((qq, i) => {
      const t = m.get(qq.topic) ?? { right: 0, total: 0 };
      t.total++;
      if (answers[i]?.correct) t.right++;
      m.set(qq.topic, t);
    });
    return [...m.entries()];
  }, [questions, answers]);

  return (
    <div className="view">
      <div className="page-scroll">
        <div className="page-inner quiz-inner">
          <div className="page-head">
            <p className="eyebrow">05 · Knowledge Check</p>
            <h2>Test your understanding</h2>
            <p>
              {questions.length} questions. Every correct answer is worked out by running the same search engine
              as the app, so the explanations quote real numbers.
            </p>
          </div>

          {!done && q && (
            <section className="card quiz-card" aria-label={`Question ${index + 1} of ${questions.length}`}>
              <div className="quiz-top">
                <span className="phase-chip phase-select">{q.topic}</span>
                <span className="progress-text">
                  Question {index + 1} / {questions.length}
                </span>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
              </div>

              <h3 className="quiz-prompt">{q.prompt}</h3>

              <div className="quiz-body">
                {q.kind === 'choice' && q.board && (
                  <QuizBoard
                    board={q.board}
                    interactive={false}
                    selected={[]}
                    answered={false}
                    correctCells={[]}
                    marks={[]}
                    onCell={() => {}}
                  />
                )}

                {q.kind === 'choice' && (
                  <div className="quiz-options" role="radiogroup" aria-label="Answers">
                    {q.options.map((opt, i) => {
                      const picked = answer?.picked[0] === i;
                      const right = answered && i === q.answer;
                      return (
                        <button
                          key={i}
                          role="radio"
                          aria-checked={picked}
                          disabled={answered}
                          className={
                            'quiz-option' + (right ? ' opt-ok' : '') + (picked && !right ? ' opt-bad' : '')
                          }
                          onClick={() => submit([i], i === q.answer)}
                        >
                          <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.kind === 'cell' && (
                  <QuizBoard
                    board={q.board}
                    interactive={!answered}
                    selected={answer?.picked ?? []}
                    answered={answered}
                    correctCells={q.answers}
                    marks={[]}
                    onCell={(i) => submit([i], q.answers.includes(i))}
                  />
                )}

                {q.kind === 'cells' && (
                  <div className="quiz-cells">
                    <QuizBoard
                      board={q.board}
                      interactive={!answered}
                      selected={answered ? answer.picked : draft}
                      answered={answered}
                      correctCells={q.answers}
                      marks={q.marks}
                      onCell={(i) =>
                        setDraft((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))
                      }
                    />
                    {!answered && (
                      <button
                        className="btn btn-primary"
                        disabled={draft.length === 0}
                        onClick={() => {
                          const sorted = [...draft].sort((a, b) => a - b);
                          const want = [...q.answers].sort((a, b) => a - b);
                          submit(sorted, sorted.length === want.length && sorted.every((v, k) => v === want[k]));
                        }}
                      >
                        Check answer
                      </button>
                    )}
                  </div>
                )}
              </div>

              {answered && (
                <div
                  className={'quiz-feedback ' + (answer.correct ? 'fb-ok' : 'fb-bad')}
                  role="status"
                  aria-live="polite"
                >
                  <strong>{answer.correct ? 'Correct.' : 'Not quite.'}</strong> {q.explanation}
                </div>
              )}

              {answered && (
                <div className="quiz-actions">
                  <button className="btn btn-primary" onClick={next}>
                    {index + 1 === questions.length ? 'See results' : 'Next question'}
                    <Icon>
                      <path d="M3 3l7 5-7 5V3z" />
                    </Icon>
                  </button>
                </div>
              )}
            </section>
          )}

          {done && (
            <section className="card quiz-card quiz-results" aria-label="Results">
              <p className="eyebrow">Results</p>
              <p className="quiz-score">
                {score} <span>/ {questions.length}</span>
              </p>
              <p className="quiz-verdict">
                {score === questions.length
                  ? 'Perfect. You can explain Minimax and Alpha-Beta from first principles.'
                  : score >= Math.ceil(questions.length * 0.7)
                    ? 'Solid understanding. Review the topics below that you missed.'
                    : 'Good start. Revisit the Learn Minimax tab, then try again.'}
              </p>
              <ul className="topic-results">
                {byTopic.map(([topic, r]) => (
                  <li key={topic}>
                    <span>{topic}</span>
                    <span className="topic-bar">
                      <i style={{ width: `${(r.right / r.total) * 100}%` }} />
                    </span>
                    <span className="topic-num">
                      {r.right}/{r.total}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary" onClick={restart}>
                Retake quiz
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
