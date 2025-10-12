'use client';

import { Button } from '@/components/Button';

export type TicTacToeCell = 'X' | 'O' | null;
export type TicTacToeBoard = TicTacToeCell[];

interface TicTacToeBoardProps {
  board: TicTacToeBoard;
  onCellClick: (index: number) => void;
  isMyTurn: boolean;
  isGameOver: boolean;
  winner: string | null;
  playerSymbol: 'X' | 'O';
  player1Address?: string;
  player2Address?: string;
  player1DisplayName?: string;
  player2DisplayName?: string;
  wager?: string;
  gameCreatedAt?: string;
}

export function TicTacToeBoard({
  board,
  onCellClick,
  isMyTurn,
  isGameOver,
  winner,
  playerSymbol,
  player1Address,
  player2Address,
  player1DisplayName,
  player2DisplayName,
  wager,
  gameCreatedAt,
}: TicTacToeBoardProps) {
  const getCellClassName = (cell: TicTacToeCell, index: number) => {
    const baseClasses = 'w-24 h-24 flex items-center justify-center text-4xl font-bold rounded-lg transition-all';
    const borderClasses = 'border-2 border-korus-border hover:border-korus-primary';
    const bgClasses = cell === null && isMyTurn && !isGameOver
      ? 'bg-korus-surface/40 hover:bg-korus-surface/60 cursor-pointer'
      : 'bg-korus-surface/60 cursor-not-allowed';
    const textClasses = cell === 'X'
      ? 'text-korus-primary'
      : cell === 'O'
        ? 'text-korus-secondary'
        : '';

    return `${baseClasses} ${borderClasses} ${bgClasses} ${textClasses}`;
  };

  const handleCellClick = (index: number) => {
    console.log('Cell clicked:', { index, cell: board[index], isMyTurn, isGameOver });
    if (board[index] !== null || !isMyTurn || isGameOver) {
      console.log('Click blocked:', { cellOccupied: board[index] !== null, notMyTurn: !isMyTurn, gameOver: isGameOver });
      return;
    }
    console.log('Making move:', index);
    onCellClick(index);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const getDisplayName = (address?: string, displayName?: string) => {
    if (!address) return 'Unknown';
    if (displayName) return displayName;
    return truncateAddress(address);
  };

  // Calculate Korus fee (2% of wager)
  const KORUS_FEE_PERCENTAGE = 0.02;
  const wagerAmount = parseFloat(wager || '0');
  const korusFee = wagerAmount * KORUS_FEE_PERCENTAGE;
  const winnerPayout = (wagerAmount * 2) - korusFee;

  return (
    <div className="w-full pt-3 pb-1 relative">
      {/* Game Info Bar - Players */}
      {(player1Address || player2Address) && (
        <div className="flex items-center justify-between mb-2 px-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-korus-textSecondary">Players:</span>
            <span className="font-semibold text-korus-primary">
              {getDisplayName(player1Address, player1DisplayName)} (X)
            </span>
            <span className="text-korus-textSecondary">vs</span>
            <span className="font-semibold text-korus-secondary">
              {getDisplayName(player2Address, player2DisplayName)} (O)
            </span>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mb-3 text-center">
        {isGameOver ? (
          <div className="text-xl font-bold">
            {winner === 'draw' ? (
              <span className="text-korus-textSecondary">Game ended in a draw!</span>
            ) : winner === playerSymbol ? (
              <span className="text-korus-primary">You won! 🎉</span>
            ) : (
              <span className="text-red-500">You lost</span>
            )}
          </div>
        ) : (
          <div className="text-lg">
            {isMyTurn ? (
              <span className="text-korus-primary font-bold">Your turn ({playerSymbol})</span>
            ) : (
              <span className="text-korus-textSecondary">Opponent's turn...</span>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-3 justify-center mb-3">
        {board.map((cell, index) => (
          <button
            key={index}
            className={getCellClassName(cell, index)}
            onClick={() => handleCellClick(index)}
            disabled={cell !== null || !isMyTurn || isGameOver}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Wager Info Bar */}
      {wagerAmount > 0 && (
        <div className="flex items-center justify-between px-2 text-xs bg-korus-surface/30 rounded-lg py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-korus-textSecondary">Wager:</span>
              <span className="font-bold text-korus-primary">{wagerAmount} SOL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-korus-textSecondary">Korus Fee (2%):</span>
              <span className="font-semibold text-yellow-400">{korusFee.toFixed(4)} SOL</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-korus-textSecondary">Winner gets:</span>
            <span className="font-bold text-green-400">{winnerPayout.toFixed(4)} SOL</span>
          </div>
        </div>
      )}
    </div>
  );
}
