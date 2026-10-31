import { useStore } from '../store';
import { Icon } from './Icon';

/** Previous / Next / Play-Pause-Replay / Skip, plus a progress bar. Shared by Playground and Explorer. */
export function PlaybackControls({ compact = false }: { compact?: boolean }) {
  const mode = useStore((s) => s.mode);
  const steps = useStore((s) => s.steps);
  const currentStepIndex = useStore((s) => s.currentStepIndex);
  const vizStep = useStore((s) => s.vizStep);
  const vizPlay = useStore((s) => s.vizPlay);
  const vizPause = useStore((s) => s.vizPause);
  const vizFinish = useStore((s) => s.vizFinish);
  const vizSeek = useStore((s) => s.vizSeek);

  const hasSteps = steps.length > 0;
  const atEnd = hasSteps && currentStepIndex >= steps.length - 1;
  const progress = hasSteps ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;

  const replay = () => {
    vizSeek(-1);
    vizPlay();
  };

  return (
    <div className="playback">
      {!compact && (
        <>
          <div className="group-head">
            <h2 className="group-title">Search playback</h2>
            {hasSteps && (
              <span className="progress-text">
                {Math.max(currentStepIndex + 1, 0)} / {steps.length}
              </span>
            )}
          </div>

          <div
            className="progress-bar"
            role="progressbar"
            aria-label="Search progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      <div className="btn-row btn-row-4">
        <button
          className="btn"
          onClick={() => vizSeek(currentStepIndex - 1)}
          disabled={!hasSteps || currentStepIndex < 0}
          aria-label="Previous step"
        >
          <Icon>
            <path d="M13 3l-7 5 7 5V3zM4 3h1.6v10H4V3z" />
          </Icon>
          Prev
        </button>
        <button
          className="btn"
          onClick={vizStep}
          disabled={!hasSteps || atEnd || mode === 'playing'}
          aria-label="Next step"
        >
          <Icon>
            <path d="M3 3l7 5-7 5V3zm9 0h1.6v10H12V3z" />
          </Icon>
          Next
        </button>
        {mode === 'playing' ? (
          <button className="btn btn-accent" onClick={vizPause}>
            <Icon>
              <path d="M4 3h3v10H4V3zm5 0h3v10H9V3z" />
            </Icon>
            Pause
          </button>
        ) : atEnd ? (
          <button className="btn btn-accent" onClick={replay}>
            <Icon>
              <path d="M8 2.5a5.5 5.5 0 105.2 7.3h-1.6A4 4 0 118 4v2.2l3.2-3L8 0v2.5z" transform="translate(0 1)" />
            </Icon>
            Replay
          </button>
        ) : (
          <button className="btn btn-accent" onClick={vizPlay} disabled={!hasSteps}>
            <Icon>
              <path d="M4 2.8v10.4a.6.6 0 00.92.5l8.2-5.2a.6.6 0 000-1L4.92 2.3a.6.6 0 00-.92.5z" />
            </Icon>
            Play
          </button>
        )}
        <button className="btn" onClick={vizFinish} disabled={!hasSteps || atEnd}>
          <Icon>
            <path d="M2 3l6 5-6 5V3zm6 0l6 5-6 5V3z" />
          </Icon>
          Skip
        </button>
      </div>
    </div>
  );
}
