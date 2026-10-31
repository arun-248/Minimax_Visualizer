import { useStore } from '../store';
import { getWinningCells } from '../minimax';

function Mark({ player }: { player: 'X' | 'O' }) {
  return (
    <svg className={`cell-mark cell-mark-${player}`} viewBox="0 0 48 48" aria-hidden="true">
      {player === 'X' ? (
        <>
          <path d="M11 11 L37 37" pathLength={1} />
          <path d="M37 11 L11 37" pathLength={1} />
        </>
      ) : (
        <circle cx="24" cy="24" r="14" pathLength={1} />
      )}
    </svg>
  );
}

export function Board() {
  const game = useStore((s) => s.game);
  const lastMove = useStore((s) => s.lastMove);
  const mode = useStore((s) => s.mode);
  const humanMove = useStore((s) => s.humanMove);
  const aiThink = useStore((s) => s.aiThink);
  const aiMoveInstant = useStore((s) => s.aiMoveInstant);

  const disabled = game.gameOver || game.currentPlayer !== 'X' || mode !== 'idle';
  const winningCells = game.winner && game.winner !== 'draw' ? getWinningCells(game.board) : [];

  const handleClick = (index: number) => {
    if (disabled || game.board[index] !== null) return;
    humanMove(index);
    setTimeout(() => {
      const state = useStore.getState();
      if (!state.game.gameOver && state.game.currentPlayer === 'O') {
        // Skip visualization for the first AI move (8 empty cells) - tree is too large
        const emptyCells = state.game.board.filter((c) => c === null).length;
        if (emptyCells >= 8) {
          aiMoveInstant();
        } else {
          aiThink();
        }
      }
    }, 300);
  };

  return (
    <section className="card board-card" aria-label="Game board">
      <div className="players">
        <span className={'player-chip player-x' + (game.currentPlayer === 'X' && !game.gameOver ? ' is-turn' : '')}>
          <span className="player-glyph">X</span> You
        </span>
        <span className="players-vs">vs</span>
        <span className={'player-chip player-o' + (game.currentPlayer === 'O' && !game.gameOver ? ' is-turn' : '')}>
          <span className="player-glyph">O</span> AI
        </span>
      </div>

      <div className="board-container">
        <div className="board" role="group" aria-label="Tic-Tac-Toe board">
          {game.board.map((cell, i) => {
            const isWinning = winningCells.includes(i);
            const isLast = lastMove === i;
            const isLocked = disabled || cell !== null;
            const row = Math.floor(i / 3) + 1;
            const col = (i % 3) + 1;
            return (
              <button
                key={i}
                className={
                  'cell' +
                  (cell ? ` cell-${cell}` : '') +
                  (isWinning ? ' cell-winning' : '') +
                  (isLast ? ' cell-last' : '') +
                  (disabled || cell ? ' cell-disabled' : '')
                }
                onClick={() => handleClick(i)}
                disabled={isLocked}
                aria-label={`Row ${row}, column ${col}: ${cell ?? 'empty'}`}
              >
                {cell && <Mark player={cell} />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
