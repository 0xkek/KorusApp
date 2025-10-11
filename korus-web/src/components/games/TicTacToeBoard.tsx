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
}

export function TicTacToeBoard({
  board,
  onCellClick,
  isMyTurn,
  isGameOver,
  winner,
  playerSymbol,
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
    if (board[index] !== null || !isMyTurn || isGameOver) return;
    onCellClick(index);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status */}
      <div className="text-center">
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
      <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
}
