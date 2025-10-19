'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';

export type RPSMove = 'rock' | 'paper' | 'scissors';

interface RPSGameProps {
  onMoveSelected: (move: RPSMove) => void;
  playerMove: RPSMove | null;
  opponentMove: RPSMove | null;
  isMyTurn: boolean;
  isGameOver: boolean;
  winner: string | null;
  player1Address?: string;
  player2Address?: string;
  player1DisplayName?: string;
  player2DisplayName?: string;
  currentTurnAddress?: string;
  gameCreatedAt?: string;
  wager?: string; // SOL amount
  gameState?: { player1Score?: number; player2Score?: number; rounds?: unknown[]; round?: number; roundResults?: unknown[] }; // Full game state with score and round info
  payoutTxSignature?: string; // Transaction signature for blockchain payout
}

const CHOICES = [
  { id: 'rock' as RPSMove, icon: '✊', name: 'Rock' },
  { id: 'paper' as RPSMove, icon: '✋', name: 'Paper' },
  { id: 'scissors' as RPSMove, icon: '✌️', name: 'Scissors' }
];

export function RockPaperScissorsGame({
  onMoveSelected,
  playerMove,
  opponentMove,
  isMyTurn,
  isGameOver,
  winner,
  player1Address,
  player2Address,
  player1DisplayName,
  player2DisplayName,
  currentTurnAddress,
  gameCreatedAt,
  wager,
  gameState,
  payoutTxSignature,
}: RPSGameProps) {
  const [selectedChoice, setSelectedChoice] = useState<RPSMove | null>(playerMove);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showTimerInfo, setShowTimerInfo] = useState(false);
  const [showDrawNotification, setShowDrawNotification] = useState(false);
  const [previousRound, setPreviousRound] = useState<number>(1);
  const [lastDrawResult, setLastDrawResult] = useState<{ player1: RPSMove; player2: RPSMove } | null>(null);

  // Use selectedChoice OR playerMove to prevent double-clicking
  const canMakeChoice = isMyTurn && !playerMove && !selectedChoice && !isGameOver;

  // Extract round info from gameState
  const currentRound = gameState?.round || 1;

  // Detect when a draw occurred (round increased)
  useEffect(() => {
    if (currentRound > previousRound && !isGameOver) {
      // A draw just occurred - get the last round result
      const roundResults = gameState?.roundResults as unknown[] | undefined;
      const lastResult = roundResults?.[roundResults.length - 1] as { winner?: string; player1Choice?: RPSMove; player2Choice?: RPSMove } | undefined;

      if (lastResult && lastResult.winner === 'draw') {
        setLastDrawResult({
          player1: lastResult.player1Choice!,
          player2: lastResult.player2Choice!
        });
        setShowDrawNotification(true);

        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowDrawNotification(false);
        }, 3000);
      }

      setPreviousRound(currentRound);
    }
  }, [currentRound, previousRound, isGameOver, gameState]);

  // Sync selectedChoice with playerMove when it updates from backend
  useEffect(() => {
    setSelectedChoice(playerMove);
  }, [playerMove]);

  // Debug logging
  logger.log('RPS Game State:', {
    isMyTurn,
    playerMove,
    isGameOver,
    canMakeChoice,
    currentTurnAddress,
    player1Address,
    player2Address
  });

  // Calculate Korus fee (2% of wager)
  const KORUS_FEE_PERCENTAGE = 0.02;
  const wagerAmount = parseFloat(wager || '0');
  const korusFee = wagerAmount * KORUS_FEE_PERCENTAGE;
  const winnerPayout = (wagerAmount * 2) - korusFee;

  // Calculate time remaining (24h from last move or game start)
  useEffect(() => {
    if (!gameCreatedAt || isGameOver) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const gameStart = new Date(gameCreatedAt).getTime();
      const deadline = gameStart + (24 * 60 * 60 * 1000); // 24 hours
      const remaining = deadline - now;

      if (remaining <= 0) {
        setTimeLeft('Expired');
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [gameCreatedAt, isGameOver]);

  const handleChoicePress = (choice: RPSMove) => {
    if (!canMakeChoice) return;

    setSelectedChoice(choice);
    onMoveSelected(choice);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const getDisplayName = (address?: string, displayName?: string) => {
    if (!address) return 'Unknown';
    if (displayName) return displayName;
    return truncateAddress(address);
  };

  return (
    <div className="w-full pt-3 pb-1 relative">
      {/* Draw Notification - Inline */}
      {showDrawNotification && lastDrawResult && (
        <div className="mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-3 text-center">
          <div
            className="text-xl font-bold mb-2"
            style={{
              color: 'white',
              WebkitTextFillColor: 'white'
            }}
          >
            🤝 DRAW!
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl">
              {CHOICES.find(c => c.id === lastDrawResult.player1)?.icon}
            </span>
            <span
              className="text-xl font-bold"
              style={{
                color: 'white',
                WebkitTextFillColor: 'white'
              }}
            >
              =
            </span>
            <span className="text-3xl">
              {CHOICES.find(c => c.id === lastDrawResult.player2)?.icon}
            </span>
          </div>
          <div
            className="text-xs font-medium"
            style={{
              color: 'white',
              WebkitTextFillColor: 'white'
            }}
          >
            Starting Round {currentRound}...
          </div>
        </div>
      )}

      {/* Game Info Bar - Players */}
      <div className="flex items-center justify-between mb-2 px-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-korus-textSecondary">Players:</span>
          <span className="font-semibold text-korus-primary">
            {getDisplayName(player1Address, player1DisplayName)}
          </span>
          <span className="text-korus-textSecondary">vs</span>
          <span className="font-semibold text-korus-secondary">
            {getDisplayName(player2Address, player2DisplayName)}
          </span>
        </div>
        {!isGameOver && timeLeft && (
          <div className="flex items-center gap-1.5 relative">
            <span className="text-korus-textSecondary">⏱</span>
            <span className={`font-semibold ${timeLeft === 'Expired' ? 'text-red-400' : 'text-white'}`}>
              {timeLeft}
            </span>
            <button
              onClick={() => setShowTimerInfo(!showTimerInfo)}
              className="ml-1 text-korus-textSecondary hover:text-white transition-colors"
              aria-label="Timer info"
            >
              ℹ️
            </button>
            {showTimerInfo && (
              <div className="absolute top-6 right-0 bg-korus-surface border border-korus-border rounded-lg p-2 w-48 text-xs shadow-lg z-10">
                <p className="text-white">Each player has 24 hours to make their move. If time expires, they lose!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Round Info */}
      {!isGameOver && currentRound > 1 && (
        <div className="flex items-center justify-center mb-3 px-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-korus-textSecondary">Round:</span>
            <span className="font-bold text-white">{currentRound}</span>
            <span className="text-korus-textSecondary text-[10px]">(Draw - play again!)</span>
          </div>
        </div>
      )}

      {/* Status Message or Game Result */}
      {!isGameOver ? (
        <div className="mb-3 text-center">
          {!playerMove && (
            <p className={`text-xs font-semibold ${
              canMakeChoice ? 'text-korus-primary' : 'text-korus-textSecondary'
            }`}>
              {canMakeChoice ? '👉 Make your choice!' : '⏳ Waiting for your turn...'}
            </p>
          )}

          {playerMove && (
            <p className="text-xs font-semibold text-korus-textSecondary">
              ⏳ Waiting for opponent...
            </p>
          )}
        </div>
      ) : (
        /* Game Over - Show Results */
        <div className="mb-3">
          {/* Winner/Loser Banner */}
          <div className={`rounded-xl p-4 text-center mb-3 ${
            winner === 'you'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : winner === 'opponent'
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
          }`}>
            <div
              className="text-3xl font-bold mb-2"
              style={{ color: 'white', WebkitTextFillColor: 'white' }}
            >
              {winner === 'you' ? '🎉 YOU WIN!' : winner === 'opponent' ? '💔 YOU LOSE' : '🤝 DRAW'}
            </div>

            {wagerAmount > 0 && winner === 'you' && (
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
                {winner === 'you'
                  ? `Won ${(wagerAmount * 2).toFixed(4)} SOL (${korusFee.toFixed(4)} SOL fee)`
                  : winner === 'opponent'
                  ? `Lost ${wagerAmount} SOL wager`
                  : 'Wagers returned'}
              </div>
            )}

            {/* Transaction Link */}
            {payoutTxSignature && wagerAmount > 0 && (
              <a
                href={`https://explorer.solana.com/tx/${payoutTxSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs underline hover:opacity-80 transition-opacity"
                style={{ color: 'white', WebkitTextFillColor: 'white' }}
              >
                View payout on Solana Explorer →
              </a>
            )}
          </div>

          {/* Show both players' choices */}
          {opponentMove && (
            <div className="bg-korus-surface/50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <div
                    className="text-xs mb-1 font-medium"
                    style={{ color: 'white', WebkitTextFillColor: 'white' }}
                  >
                    You
                  </div>
                  <span className="text-4xl mb-1">
                    {CHOICES.find(c => c.id === playerMove)?.icon}
                  </span>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: 'white', WebkitTextFillColor: 'white' }}
                  >
                    {CHOICES.find(c => c.id === playerMove)?.name}
                  </div>
                </div>

                <div
                  className="text-2xl font-bold"
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                >
                  VS
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className="text-xs mb-1 font-medium"
                    style={{ color: 'white', WebkitTextFillColor: 'white' }}
                  >
                    Opponent
                  </div>
                  <span className="text-4xl mb-1">
                    {CHOICES.find(c => c.id === opponentMove)?.icon}
                  </span>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: 'white', WebkitTextFillColor: 'white' }}
                  >
                    {CHOICES.find(c => c.id === opponentMove)?.name}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Choice Buttons - All in one row */}
      <div className="flex justify-center gap-3 mb-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoicePress(choice.id)}
            disabled={!canMakeChoice}
            className={`
              relative w-20 h-20 rounded-2xl
              flex flex-col items-center justify-center
              transition-all duration-200
              ${playerMove === choice.id
                ? 'bg-gradient-to-br from-korus-primary to-korus-secondary border-3 border-korus-primary shadow-lg scale-105'
                : selectedChoice === choice.id && canMakeChoice
                ? 'bg-gradient-to-br from-korus-primary/40 to-korus-primary/20 border-2 border-korus-primary/80'
                : 'bg-gradient-to-br from-korus-surface to-korus-cardBackground border-2 border-korus-border hover:border-korus-primary/50 hover:scale-105'
              }
              ${!canMakeChoice && !playerMove ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${canMakeChoice ? 'hover:shadow-lg' : ''}
            `}
          >
            <span className="text-3xl mb-0.5">{choice.icon}</span>
            <span
              className="text-[10px] font-bold uppercase"
              style={{
                color: 'white',
                opacity: 1,
                WebkitTextFillColor: 'white',
                filter: 'none'
              }}
            >
              {choice.name}
            </span>
            {playerMove === choice.id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}
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
