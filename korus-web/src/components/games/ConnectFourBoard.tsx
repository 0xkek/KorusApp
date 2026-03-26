'use client';

export type ConnectFourCell = 'red' | 'yellow' | null;
export type ConnectFourBoard = ConnectFourCell[][];

interface ConnectFourBoardProps {
  board: ConnectFourBoard;
  onColumnClick: (col: number) => void;
  isMyTurn: boolean;
  isGameOver: boolean;
  winner: string | null;
  playerColor: 'red' | 'yellow';
}

export function ConnectFourBoard({
  board,
  onColumnClick,
  isMyTurn,
  isGameOver,
  winner,
  playerColor,
}: ConnectFourBoardProps) {
  const ROWS = 6;
  const COLS = 7;

  const getCellClassName = (cell: ConnectFourCell) => {
    const baseClasses = 'w-12 h-12 rounded-full duration-150';
    if (cell === 'red') {
      return `${baseClasses} bg-red-500 shadow-lg shadow-red-500/50`;
    } else if (cell === 'yellow') {
      return `${baseClasses} bg-yellow-400 shadow-lg shadow-yellow-400/50`;
    }
    return `${baseClasses} bg-white/[0.12] border border-[var(--color-border-light)]`;
  };

  const getColumnClassName = (col: number) => {
    const baseClasses = 'flex flex-col gap-2 p-2 rounded-lg duration-150';
    if (isMyTurn && !isGameOver && canDropInColumn(col)) {
      return `${baseClasses} bg-white/[0.04] hover:bg-white/[0.06] cursor-pointer hover:scale-105`;
    }
    return `${baseClasses} bg-white/[0.04]`;
  };

  const canDropInColumn = (col: number): boolean => {
    return board[0][col] === null;
  };

  const handleColumnClick = (col: number) => {
    if (!isMyTurn || isGameOver || !canDropInColumn(col)) return;
    onColumnClick(col);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status */}
      <div className="text-center">
        {isGameOver ? (
          <div className="text-xl font-bold">
            {winner === 'draw' ? (
              <span className="text-[var(--color-text-secondary)]">Game ended in a draw!</span>
            ) : winner === playerColor ? (
              <span className="text-korus-primary">You won! 🎉</span>
            ) : (
              <span className="text-red-500">You lost</span>
            )}
          </div>
        ) : (
          <div className="text-lg">
            {isMyTurn ? (
              <span className="text-korus-primary font-bold">
                Your turn (
                <span className={playerColor === 'red' ? 'text-red-500' : 'text-yellow-400'}>
                  {playerColor === 'red' ? '🔴' : '🟡'}
                </span>
                )
              </span>
            ) : (
              <span className="text-[var(--color-text-secondary)]">Opponent&apos;s turn...</span>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="bg-white/[0.06] p-4 rounded-xl border-2 border-[var(--color-border-light)]">
        <div className="flex gap-2">
          {Array.from({ length: COLS }).map((_, col) => (
            <div
              key={col}
              className={getColumnClassName(col)}
              onClick={() => handleColumnClick(col)}
            >
              {Array.from({ length: ROWS }).map((_, row) => (
                <div key={row} className={getCellClassName(board[row][col])} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {!isGameOver && isMyTurn && (
        <div className="text-sm text-[var(--color-text-secondary)]">
          Click on a column to drop your piece
        </div>
      )}
    </div>
  );
}
