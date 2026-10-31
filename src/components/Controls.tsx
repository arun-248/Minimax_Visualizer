import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { Icon } from './Icon';
import { PlaybackControls } from './PlaybackControls';

const DEPTH_OPTIONS: { value: number | null; short: string; label: string }[] = [
  { value: 3, short: '3', label: 'Easy' },
  { value: 4, short: '4', label: 'Normal' },
  { value: 5, short: '5', label: 'Hard' },
  { value: 6, short: '6', label: 'Expert' },
  { value: null, short: '∞', label: 'Unbeatable' },
];

const SPEED_MIN = 20;
const SPEED_MAX = 500;

export function Controls() {
  const mode = useStore((s) => s.mode);
  const speed = useStore((s) => s.speed);
  const depthLimit = useStore((s) => s.depthLimit);
  const game = useStore((s) => s.game);

  const aiMove = useStore((s) => s.aiMove);
  const setSpeed = useStore((s) => s.setSpeed);
  const setDepthLimit = useStore((s) => s.setDepthLimit);
  const resetGame = useStore((s) => s.resetGame);

  const canApply = mode === 'done' && !game.gameOver;

  // The slider is inverted: moving right means a shorter delay (faster).
  const sliderValue = SPEED_MAX + SPEED_MIN - speed;
  const sliderFill = ((sliderValue - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;
  const activeDepth = DEPTH_OPTIONS.find((o) => o.value === depthLimit) ?? DEPTH_OPTIONS[0];

  return (
    <div className="controls">
      {/* Playback */}
      <section className="card control-group" aria-label="Search playback">
        <PlaybackControls />
        <button className="btn btn-primary btn-wide" onClick={aiMove} disabled={!canApply}>
          <Icon>
            <path d="M6.2 11.6L2.8 8.2l1.1-1.1 2.3 2.3 5.9-5.9 1.1 1.1-7 7z" />
          </Icon>
          Apply AI Move
        </button>
      </section>

      {/* Settings */}
      <section className="card control-group" aria-label="Search settings">
        <h2 className="group-title">Search settings</h2>

        <div className="setting">
          <div className="setting-head">
            <label htmlFor="speed-range" className="setting-label">
              Animation speed
            </label>
            <span className="setting-value">{speed} ms / step</span>
          </div>
          <input
            id="speed-range"
            className="range"
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={10}
            value={sliderValue}
            style={{ '--fill': `${sliderFill}%` } as CSSProperties}
            onChange={(e) => setSpeed(SPEED_MAX + SPEED_MIN - Number(e.target.value))}
          />
          <div className="range-ends" aria-hidden="true">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">
            <span className="setting-label" id="depth-label">
              Search depth
            </span>
            <span className="setting-value">{activeDepth.label}</span>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="depth-label">
            {DEPTH_OPTIONS.map((opt) => {
              const selected = opt.value === depthLimit;
              return (
                <button
                  key={opt.short}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Depth ${opt.value === null ? 'full' : opt.short} — ${opt.label}`}
                  title={`${opt.value === null ? 'Full' : opt.short} — ${opt.label}`}
                  className={'segment' + (selected ? ' segment-on' : '')}
                  onClick={() => setDepthLimit(opt.value)}
                >
                  {opt.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">
            <span className="setting-label">Alpha-beta pruning</span>
            <span className="setting-value">Always on</span>
          </div>
          <p className="setting-note">
            The live AI always prunes. Turn pruning on and off side by side in{' '}
            <strong>Compare Algorithms</strong>.
          </p>
        </div>
      </section>

      <button className="btn btn-ghost btn-wide" onClick={resetGame}>
        <Icon>
          <path d="M8 2.5a5.5 5.5 0 105.2 7.3h-1.6A4 4 0 118 4v2.2l3.2-3L8 0v2.5z" transform="translate(0 1)" />
        </Icon>
        New Game
      </button>
    </div>
  );
}
