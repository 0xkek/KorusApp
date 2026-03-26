'use client';
import { logger } from '@/utils/logger';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { useGameEscrow, GameType } from '@/hooks/useGameEscrow';
import { gamesAPI } from '@/lib/api/games';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface CreateGameModalProps {
  postId: number;
  onClose: () => void;
  onGameCreated: (gameId: number) => void;
}

export function CreateGameModal({ postId, onClose, onGameCreated }: CreateGameModalProps) {
  const { connected } = useWallet();
  const { createGame, isProcessing } = useGameEscrow();
  const [gameType, setGameType] = useState<GameType>('tictactoe');
  const [wager, setWager] = useState<string>('0.1');
  const [error, setError] = useState<string | null>(null);

  const handleCreateGame = async () => {
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    const wagerSol = parseFloat(wager);
    if (isNaN(wagerSol) || wagerSol < 0) {
      setError('Invalid wager amount');
      return;
    }

    setError(null);

    try {
      let onChainGameId: number | undefined;

      // Only create blockchain game if there's a wager
      if (wagerSol > 0) {
        const wagerLamports = Math.floor(wagerSol * LAMPORTS_PER_SOL);
        const result = await createGame(gameType, wagerLamports);
        onChainGameId = result.gameId;
      }

      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setError('Not authenticated. Please sign in with your wallet.');
        return;
      }

      // Create game in backend
      const response = await gamesAPI.createGame(
        {
          postId,
          gameType,
          wager: wagerSol,
          onChainGameId,
        },
        token
      );

      if (response.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onGameCreated(response.game.id as any);
        onClose();
      }
    } catch (err) {
      logger.error('Failed to create game:', err);
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-overlay-background)] backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">Create Game Challenge</h2>

        {/* Game Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Game Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`p-3 rounded-lg border-2 duration-150 ${
                gameType === 'tictactoe'
                  ? 'border-korus-primary bg-korus-primary/20 text-[var(--color-text)]'
                  : 'border-[var(--color-border-light)] bg-white/[0.06] text-[var(--color-text-secondary)] hover:border-korus-primary/50'
              }`}
              onClick={() => setGameType('tictactoe')}
            >
              <div className="text-2xl mb-1">⭕️❌</div>
              <div className="text-xs">Tic Tac Toe</div>
            </button>
            <button
              className={`p-3 rounded-lg border-2 duration-150 ${
                gameType === 'rps'
                  ? 'border-korus-primary bg-korus-primary/20 text-[var(--color-text)]'
                  : 'border-[var(--color-border-light)] bg-white/[0.06] text-[var(--color-text-secondary)] hover:border-korus-primary/50'
              }`}
              onClick={() => setGameType('rps')}
            >
              <div className="text-2xl mb-1">✊📄✂️</div>
              <div className="text-xs">RPS</div>
            </button>
            <button
              className={`p-3 rounded-lg border-2 duration-150 ${
                gameType === 'connectfour'
                  ? 'border-korus-primary bg-korus-primary/20 text-[var(--color-text)]'
                  : 'border-[var(--color-border-light)] bg-white/[0.06] text-[var(--color-text-secondary)] hover:border-korus-primary/50'
              }`}
              onClick={() => setGameType('connectfour')}
            >
              <div className="text-2xl mb-1">🔴🟡</div>
              <div className="text-xs">Connect 4</div>
            </button>
          </div>
        </div>

        {/* Wager Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Wager (SOL)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={wager}
            onChange={(e) => setWager(e.target.value)}
            className="w-full px-4 py-2 bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg text-[var(--color-text)] focus:border-korus-primary focus:outline-none duration-150"
            placeholder="0.1"
          />
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Set to 0 for a friendly game (no blockchain escrow)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            fullWidth
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateGame}
            fullWidth
            isLoading={isProcessing}
            disabled={!connected}
          >
            {!connected ? 'Connect Wallet' : 'Create Game'}
          </Button>
        </div>
      </div>
    </div>
  );
}
