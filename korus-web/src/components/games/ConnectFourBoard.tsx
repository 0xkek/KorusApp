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
  currentPlayerAddress?: string;
  wager?: string;
  payoutTxSignature?: string | null;
  onDismiss?: () => void;
}

export function ConnectFourBoard({
  board,
  onColumnClick,
  isMyTurn,
  isGameOver,
  winner,
  playerColor,
  currentPlayerAddress,
  wager,
  payoutTxSignature,
  onDismiss,
}: ConnectFourBoardProps) {
  const ROWS = 6;
  const COLS = 7;

  // Calculate Korus fee (2% of wager)
  const KORUS_FEE_PERCENTAGE = 0.02;
  const wagerAmount = parseFloat(wager || '0');
  const korusFee = wagerAmount * KORUS_FEE_PERCENTAGE;
  const winnerPayout = (wagerAmount * 2) - korusFee;

  const getCellStyle = (cell: ConnectFourCell): React.CSSProperties => {
    if (cell === 'red') {
      return { backgroundColor: '#ef4444', boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)' };
    } else if (cell === 'yellow') {
      return { backgroundColor: '#facc15', boxShadow: '0 0 12px rgba(250, 204, 21, 0.5)' };
    }
    return {};
  };

  const getCellClassName = (cell: ConnectFourCell) => {
    const baseClasses = 'w-12 h-12 rounded-full duration-150';
    if (cell) {
      return baseClasses;
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
      {/* Status / Game Over Banner */}
      {isGameOver ? (() => {
        const isDraw = winner === 'draw' || (!winner && isGameOver);
        const iWon = !isDraw && winner === currentPlayerAddress;
        const iLost = !isDraw && !iWon;
        return (
          <div className="w-full">
            <div className={`rounded-xl p-4 text-center ${
              iWon
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : iLost
                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                : 'bg-gradient-to-r from-gray-500 to-gray-600'
            }`}>
              <div
                className="text-3xl font-bold mb-1"
                style={{ color: 'white', WebkitTextFillColor: 'white' }}
              >
                {iWon ? '🎉 YOU WIN!' : iLost ? '💔 YOU LOSE' : '🤝 DRAW'}
              </div>

              {wagerAmount > 0 && iWon && (
                <div
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                >
                  +{winnerPayout.toFixed(4)} SOL
                </div>
              )}

              {wagerAmount > 0 && (
                <div
                  className="text-xs opacity-90"
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                >
                  {iWon
                    ? `Won ${(wagerAmount * 2).toFixed(4)} SOL (${korusFee.toFixed(4)} SOL fee)`
                    : iLost
                    ? `Lost ${wagerAmount} SOL wager`
                    : 'Wagers returned'}
                </div>
              )}

              {payoutTxSignature && wagerAmount > 0 && (
                <a
                  href={`https://explorer.solana.com/tx/${payoutTxSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs underline hover:opacity-80 duration-150"
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                >
                  View payout on Solana Explorer →
                </a>
              )}
            </div>
          </div>
        );
      })() : (
        <div className="text-center">
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
        </div>
      )}

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
                <div key={row} className={getCellClassName(board[row][col])} style={getCellStyle(board[row][col])} />
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

      {/* Wager Info Bar - only show during active game */}
      {wagerAmount > 0 && !isGameOver && (
        <div className="flex items-center justify-between px-2 text-xs bg-white/[0.06] rounded-lg py-1.5 w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-text-secondary)]">Wager:</span>
              <span className="font-bold text-korus-primary">{wagerAmount} SOL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-text-secondary)]">Korus Fee (2%):</span>
              <span className="font-semibold text-yellow-400">{korusFee.toFixed(4)} SOL</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-text-secondary)]">Winner gets:</span>
            <span className="font-bold text-green-400">{winnerPayout.toFixed(4)} SOL</span>
          </div>
        </div>
      )}

      {/* Close Game Button */}
      {isGameOver && onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full mt-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border-light)] rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150"
        >
          Close Game
        </button>
      )}
    </div>
  );
}
