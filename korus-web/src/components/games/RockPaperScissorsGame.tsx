'use client';

import { Button } from '@/components/Button';
import { useState } from 'react';

export type RPSMove = 'rock' | 'paper' | 'scissors';

interface RPSGameProps {
  onMoveSelected: (move: RPSMove) => void;
  playerMove: RPSMove | null;
  opponentMove: RPSMove | null;
  isMyTurn: boolean;
  isGameOver: boolean;
  winner: string | null;
}

export function RockPaperScissorsGame({
  onMoveSelected,
  playerMove,
  opponentMove,
  isMyTurn,
  isGameOver,
  winner,
}: RPSGameProps) {
  const moves: RPSMove[] = ['rock', 'paper', 'scissors'];

  const getMoveEmoji = (move: RPSMove | null) => {
    if (!move) return '❓';
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
    }
  };

  const getMoveLabel = (move: RPSMove) => {
    return move.charAt(0).toUpperCase() + move.slice(1);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status */}
      <div className="text-center">
        {isGameOver ? (
          <div className="text-xl font-bold">
            {winner === 'draw' ? (
              <span className="text-korus-textSecondary">It's a tie! 🤝</span>
            ) : winner === 'player1' ? (
              <span className="text-korus-primary">You won! 🎉</span>
            ) : (
              <span className="text-red-500">You lost</span>
            )}
          </div>
        ) : playerMove ? (
          <div className="text-lg text-korus-textSecondary">
            Waiting for opponent...
          </div>
        ) : (
          <div className="text-lg">
            {isMyTurn ? (
              <span className="text-korus-primary font-bold">Choose your move!</span>
            ) : (
              <span className="text-korus-textSecondary">Opponent is choosing...</span>
            )}
          </div>
        )}
      </div>

      {/* Moves Display */}
      {(playerMove || opponentMove) && (
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-6xl mb-2">{getMoveEmoji(playerMove)}</div>
            <div className="text-sm text-korus-textSecondary">You</div>
          </div>
          <div className="text-3xl text-korus-textSecondary">VS</div>
          <div className="text-center">
            <div className="text-6xl mb-2">
              {isGameOver ? getMoveEmoji(opponentMove) : '❓'}
            </div>
            <div className="text-sm text-korus-textSecondary">Opponent</div>
          </div>
        </div>
      )}

      {/* Move Selection */}
      {!playerMove && isMyTurn && !isGameOver && (
        <div className="flex gap-4">
          {moves.map((move) => (
            <Button
              key={move}
              variant="secondary"
              onClick={() => onMoveSelected(move)}
              className="flex flex-col items-center gap-2 w-28 h-28"
            >
              <span className="text-4xl">{getMoveEmoji(move)}</span>
              <span className="text-sm">{getMoveLabel(move)}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
