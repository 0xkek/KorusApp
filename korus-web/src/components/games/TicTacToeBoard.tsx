'use client';
import { logger } from '@/utils/logger';

export type TicTacToeCell = 'X' | 'O' | null;
export type TicTacToeBoard = TicTacToeCell[];

interface TicTacToeBoardProps {
  board: TicTacToeBoard;
  onCellClick: (index: number) => void;
  isMyTurn: boolean;
  isGameOver: boolean;
  winner: string | null; // Wallet address of winner
  playerSymbol: 'X' | 'O';
  player1Address?: string;
  player2Address?: string;
  player1DisplayName?: string;
  player2DisplayName?: string;
  wager?: string;
  gameCreatedAt?: string;
  currentPlayerAddress?: string; // Current user's wallet address
  payoutTxSignature?: string | null; // Payout transaction signature
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
  currentPlayerAddress,
  payoutTxSignature,
}: TicTacToeBoardProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getCellClassName = (cell: TicTacToeCell, _index: number) => {
    const baseClasses = 'w-24 h-24 flex items-center justify-center text-4xl font-bold rounded-lg duration-150';
    const borderClasses = 'border-2 border-[#2a2a2a] hover:border-korus-primary';
    const bgClasses = cell === null && isMyTurn && !isGameOver
      ? 'bg-white/[0.06] hover:bg-white/[0.12] cursor-pointer'
      : 'bg-white/[0.12] cursor-not-allowed';
    const textClasses = cell === 'X'
      ? 'text-korus-primary'
      : cell === 'O'
        ? 'text-korus-secondary'
        : '';

    return `${baseClasses} ${borderClasses} ${bgClasses} ${textClasses}`;
  };

  const handleCellClick = (index: number) => {
    logger.log('Cell clicked:', { index, cell: board[index], isMyTurn, isGameOver });
    if (board[index] !== null || !isMyTurn || isGameOver) {
      logger.log('Click blocked:', { cellOccupied: board[index] !== null, notMyTurn: !isMyTurn, gameOver: isGameOver });
      return;
    }
    logger.log('Making move:', index);
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
            <span className="text-[#a1a1a1]">Players:</span>
            <span className="font-semibold text-korus-primary">
              {getDisplayName(player1Address, player1DisplayName)} (X)
            </span>
            <span className="text-[#a1a1a1]">vs</span>
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
              <span className="text-[#a1a1a1]">Game ended in a draw!</span>
            ) : winner === currentPlayerAddress ? (
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
              <span className="text-[#a1a1a1]">Opponent&apos;s turn...</span>
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
        <div className="flex items-center justify-between px-2 text-xs bg-white/[0.06] rounded-lg py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1a1]">Wager:</span>
              <span className="font-bold text-korus-primary">{wagerAmount} SOL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1a1]">Korus Fee (2%):</span>
              <span className="font-semibold text-yellow-400">{korusFee.toFixed(4)} SOL</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#a1a1a1]">Winner gets:</span>
            <span className="font-bold text-green-400">{winnerPayout.toFixed(4)} SOL</span>
          </div>
        </div>
      )}

      {/* Payout Transaction Link */}
      {isGameOver && payoutTxSignature && (
        <div className="mt-2 px-2 text-xs text-center">
          <a
            href={`https://explorer.solana.com/tx/${payoutTxSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-korus-primary hover:text-korus-secondary underline"
          >
            View Payout Transaction →
          </a>
        </div>
      )}
    </div>
  );
}
