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
  gameState?: { player1Score?: number; player2Score?: number; rounds?: unknown[]; round?: number; roundResults?: unknown[]; score?: { player1: number; player2: number } }; // Full game state with score and round info
  payoutTxSignature?: string; // Transaction signature for blockchain payout
  onDismiss?: () => void; // Collapse/exit the game view
  isPlayer1?: boolean; // Whether the viewing user is player1
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
  onDismiss,
  isPlayer1: isPlayer1Prop = true,
}: RPSGameProps) {
  const [selectedChoice, setSelectedChoice] = useState<RPSMove | null>(playerMove);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showTimerInfo, setShowTimerInfo] = useState(false);
  const [showDrawNotification, setShowDrawNotification] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [lastRoundResult, setLastRoundResult] = useState<{ round: number; won: boolean; playerChoice: RPSMove; opponentChoice: RPSMove } | null>(null);
  const [previousRound, setPreviousRound] = useState<number>(1);
  const [lastDrawResult, setLastDrawResult] = useState<{ player1: RPSMove; player2: RPSMove } | null>(null);

  // Use selectedChoice OR playerMove to prevent double-clicking
  const canMakeChoice = isMyTurn && !playerMove && !selectedChoice && !isGameOver;

  // Extract round info from gameState
  const currentRound = gameState?.round || 1;

  // Detect when a round resolved (draw, win, or loss)
  useEffect(() => {
    if (currentRound > previousRound && !isGameOver) {
      const roundResults = gameState?.roundResults as unknown[] | undefined;
      const lastResult = roundResults?.[roundResults.length - 1] as { round?: number; winner?: string; player1Choice?: RPSMove; player2Choice?: RPSMove } | undefined;

      if (lastResult && lastResult.winner === 'draw') {
        setLastDrawResult({
          player1: lastResult.player1Choice!,
          player2: lastResult.player2Choice!
        });
        setShowDrawNotification(true);
        setShowRoundResult(false);
      } else if (lastResult) {
        const p1Won = lastResult.winner === 'player1';
        const viewerWon = isPlayer1Prop ? p1Won : !p1Won;
        setLastRoundResult({
          round: (lastResult.round ?? previousRound - 1) + 1,
          won: viewerWon,
          playerChoice: isPlayer1Prop ? lastResult.player1Choice! : lastResult.player2Choice!,
          opponentChoice: isPlayer1Prop ? lastResult.player2Choice! : lastResult.player1Choice!,
        });
        setShowRoundResult(true);
        setShowDrawNotification(false);
      }

      setSelectedChoice(null);
      setPreviousRound(currentRound);
    }
  }, [currentRound, previousRound, isGameOver, gameState, isPlayer1Prop]);

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

  // Calculate time remaining (10 min move timeout)
  useEffect(() => {
    if (!gameCreatedAt || isGameOver) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const gameStart = new Date(gameCreatedAt).getTime();
      const deadline = gameStart + (10 * 60 * 1000); // 10 minutes
      const remaining = deadline - now;

      if (remaining <= 0) {
        setTimeLeft('Expired');
      } else {
        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second

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
          <button
            onClick={() => {
              setShowDrawNotification(false);
              setSelectedChoice(null);
            }}
            className="mt-2 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-bold text-sm transition-colors duration-150"
            style={{ color: 'white', WebkitTextFillColor: 'white' }}
          >
            Next Round →
          </button>
        </div>
      )}

      {/* Round Win/Loss Notification - Inline */}
      {showRoundResult && lastRoundResult && (
        <div className={`mb-3 rounded-lg p-3 text-center ${
          lastRoundResult.won
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-red-500 to-orange-500'
        }`}>
          <div
            className="text-xl font-bold mb-2"
            style={{ color: 'white', WebkitTextFillColor: 'white' }}
          >
            {lastRoundResult.won ? `You won Round ${lastRoundResult.round}!` : `You lost Round ${lastRoundResult.round}`}
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl">
              {CHOICES.find(c => c.id === lastRoundResult.playerChoice)?.icon}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: 'white', WebkitTextFillColor: 'white' }}
            >
              {lastRoundResult.won ? '>' : '<'}
            </span>
            <span className="text-3xl">
              {CHOICES.find(c => c.id === lastRoundResult.opponentChoice)?.icon}
            </span>
          </div>
          <button
            onClick={() => {
              setShowRoundResult(false);
              setSelectedChoice(null);
            }}
            className="mt-2 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-bold text-sm transition-colors duration-150"
            style={{ color: 'white', WebkitTextFillColor: 'white' }}
          >
            Next Round →
          </button>
        </div>
      )}

      {/* Game Info Bar - Players */}
      <div className="flex items-center justify-between mb-2 px-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-secondary)]">Players:</span>
          <span className="font-semibold text-korus-primary">
            {getDisplayName(player1Address, player1DisplayName)}
          </span>
          <span className="text-[var(--color-text-secondary)]">vs</span>
          <span className="font-semibold text-korus-secondary">
            {getDisplayName(player2Address, player2DisplayName)}
          </span>
        </div>
        {!isGameOver && timeLeft && (
          <div className="flex items-center gap-1.5 relative">
            <span className="text-[var(--color-text-secondary)]">⏱</span>
            <span className={`font-semibold ${timeLeft === 'Expired' ? 'text-red-400' : 'text-[var(--color-text)]'}`}>
              {timeLeft}
            </span>
            <button
              onClick={() => setShowTimerInfo(!showTimerInfo)}
              className="ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] duration-150"
              aria-label="Timer info"
            >
              ℹ️
            </button>
            {showTimerInfo && (
              <div className="absolute top-6 right-0 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-lg p-2 w-48 text-xs shadow-lg z-10">
                <p className="text-[var(--color-text)]">Each player has 10 minutes to make their move. If time expires, they lose!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Round & Score Info (Best of 3) */}
      {!isGameOver && (
        <div className="flex items-center justify-center mb-3 px-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[var(--color-text-secondary)]">Best of 3</span>
            <span className="text-[var(--color-text-secondary)]">|</span>
            <span className="text-[var(--color-text-secondary)]">Round:</span>
            <span className="font-bold text-[var(--color-text)]">{currentRound}</span>
            {gameState?.score && (
              <>
                <span className="text-[var(--color-text-secondary)]">|</span>
                <span className="text-[var(--color-text-secondary)]">Score:</span>
                <span className="font-bold text-korus-primary">{gameState.score.player1}</span>
                <span className="text-[var(--color-text-secondary)]">-</span>
                <span className="font-bold text-korus-secondary">{gameState.score.player2}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Message or Game Result */}
      {!isGameOver ? (
        <div className="mb-3 text-center">
          {!playerMove && (
            <p className={`text-xs font-semibold ${
              canMakeChoice ? 'text-korus-primary' : 'text-[var(--color-text-secondary)]'
            }`}>
              {canMakeChoice ? '👉 Make your choice!' : '⏳ Waiting for your turn...'}
            </p>
          )}

          {playerMove && (
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
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
              className="text-3xl font-bold mb-1"
              style={{ color: 'white', WebkitTextFillColor: 'white' }}
            >
              {winner === 'you' ? '🎉 YOU WIN!' : winner === 'opponent' ? '💔 YOU LOSE' : '🤝 DRAW'}
            </div>

            {/* Final Score */}
            {gameState?.score && (
              <div
                className="text-sm font-semibold mb-2"
                style={{ color: 'white', WebkitTextFillColor: 'white' }}
              >
                Final Score: {gameState.score.player1} - {gameState.score.player2}
              </div>
            )}

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

          {/* Rounds Recap */}
          {gameState?.roundResults && (gameState.roundResults as unknown[]).length > 0 && (
            <div className="bg-white/[0.06] rounded-lg p-3 mb-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 text-center">Round History</div>
              <div className="flex flex-col gap-1.5">
                {(gameState.roundResults as { round?: number; player1Choice?: RPSMove; player2Choice?: RPSMove; winner?: string }[]).map((round, i) => {
                  const myIcon = CHOICES.find(c => c.id === (isPlayer1Prop ? round.player1Choice : round.player2Choice))?.icon || '?';
                  const oppIcon = CHOICES.find(c => c.id === (isPlayer1Prop ? round.player2Choice : round.player1Choice))?.icon || '?';
                  const isDraw = round.winner === 'draw';
                  const p1Won = round.winner === 'player1';
                  const iWon = isPlayer1Prop ? p1Won : !p1Won;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-white/[0.04]">
                      <span className="text-[var(--color-text-secondary)] w-14">Round {round.round || i + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-base ${iWon ? 'scale-110' : ''}`}>{myIcon}</span>
                        <span className="text-[var(--color-text-tertiary)]">vs</span>
                        <span className={`text-base ${!isDraw && !iWon ? 'scale-110' : ''}`}>{oppIcon}</span>
                      </div>
                      <span className={`font-semibold w-20 text-right ${
                        isDraw ? 'text-yellow-400' : iWon ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isDraw ? 'Draw' : iWon ? 'You won' : 'You lost'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wager Summary */}
          {wagerAmount > 0 && (
            <div className="flex items-center justify-between px-3 py-2 text-xs bg-white/[0.06] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-text-secondary)]">Wager:</span>
                <span className="font-bold text-korus-primary">{wagerAmount} SOL each</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-text-secondary)]">Pot:</span>
                <span className="font-bold text-[var(--color-text)]">{(wagerAmount * 2).toFixed(4)} SOL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-text-secondary)]">Fee:</span>
                <span className="font-semibold text-yellow-400">{korusFee.toFixed(4)} SOL</span>
              </div>
            </div>
          )}

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full mt-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border-light)] rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150"
            >
              Close Game
            </button>
          )}
        </div>
      )}

      {/* Choice Buttons - Hidden during round notifications and after game over */}
      {!isGameOver && !showDrawNotification && !showRoundResult && <div className="flex justify-center gap-3 mb-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoicePress(choice.id)}
            disabled={!canMakeChoice}
            className={`
              relative w-20 h-20 rounded-2xl
              flex flex-col items-center justify-center
              transition-all duration-150
              ${playerMove === choice.id
                ? 'bg-gradient-to-br from-korus-primary to-korus-secondary border-3 border-korus-primary shadow-lg scale-105'
                : selectedChoice === choice.id && canMakeChoice
                ? 'bg-gradient-to-br from-korus-primary/40 to-korus-primary/20 border-2 border-korus-primary/80'
                : 'bg-gradient-to-br from-[#141414] to-[#141414] border-2 border-[var(--color-border-light)] hover:border-korus-primary/50 hover:scale-105'
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
                <span className="text-[var(--color-text)] text-xs font-bold">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>}

      {/* Wager Info Bar - only during active game */}
      {wagerAmount > 0 && !isGameOver && (
        <div className="flex items-center justify-between px-2 text-xs bg-white/[0.06] rounded-lg py-1.5">
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

    </div>
  );
}
