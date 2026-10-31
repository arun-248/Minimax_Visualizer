import { useStore } from '../store';

export function StatusBar() {
  const game = useStore((s) => s.game);
  const mode = useStore((s) => s.mode);

  let text = '';
  let hint = '';
  let variant = 'default';

  if (game.gameOver) {
    if (game.winner === 'draw') {
      text = "It's a draw!";
      hint = 'Perfect play from both sides.';
      variant = 'draw';
    } else if (game.winner === 'X') {
      text = 'You win!';
      hint = 'You beat the search depth — try a higher one.';
      variant = 'win';
    } else {
      text = 'AI wins!';
      hint = 'Minimax found the winning line.';
      variant = 'lose';
    }
  } else if (mode === 'idle' && game.currentPlayer === 'X') {
    text = 'Your turn';
    hint = 'Place an X on the board.';
    variant = 'your-turn';
  } else if (mode === 'playing' || mode === 'stepping') {
    text = 'AI is thinking...';
    hint = 'Watch the search tree build.';
    variant = 'thinking';
  } else if (mode === 'done') {
    text = 'AI ready to move';
    hint = 'Search finished — apply the best move.';
    variant = 'ready';
  }

  return (
    <div className={`status-bar status-${variant}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      <div className="status-copy">
        <span className="status-text">{text}</span>
        {hint && <span className="status-hint">{hint}</span>}
      </div>
    </div>
  );
}
