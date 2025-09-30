import { useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { gameEscrowService } from '../utils/contracts/gameEscrowComplete';
import { useKorusAlert } from '../components/KorusAlertProvider';
import { logger } from '../utils/logger';

export function useGameEscrow() {
  const { currentProvider, walletAddress, balance } = useWallet();
  const { showAlert } = useKorusAlert();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const createGame = useCallback(async (
    gameType: number,
    wagerAmount: number
  ) => {
    if (!currentProvider || !walletAddress) {
      showAlert({
        title: 'Wallet Required',
        message: 'Please connect your wallet to create a game',
        type: 'error'
      });
      return null;
    }

    if (balance < wagerAmount) {
      showAlert({
        title: 'Insufficient Balance',
        message: `You need at least ${wagerAmount} SOL to create this game`,
        type: 'error'
      });
      return null;
    }

    setIsProcessing(true);
    setProgressMessage('Preparing transaction...');

    try {
      setProgressMessage('Opening wallet for approval...');

      // Create the game with wager escrow
      const gameId = await gameEscrowService.createGame(
        gameType,
        wagerAmount,
        currentProvider,
        walletAddress
      );

      showAlert({
        title: 'Game Created!',
        message: `Game #${gameId} is waiting for an opponent`,
        type: 'success'
      });

      return gameId;
    } catch (error: any) {
      logger.error('Failed to create game', error);

      // Check if wallet rejected due to simulation
      if (error.message?.includes('simulation failure')) {
        showAlert({
          title: 'Wallet Issue',
          message: 'Your wallet is blocking the transaction due to simulation. Try toggling "Trust this site" in your wallet settings and approve despite the warning.',
          type: 'warning'
        });
      } else if (error.message?.includes('cancelled') || error.message?.includes('rejected')) {
        showAlert({
          title: 'Transaction Cancelled',
          message: 'The transaction was cancelled. If you approved it, your wallet may be auto-rejecting due to the simulation warning.',
          type: 'warning'
        });
      } else {
        showAlert({
          title: 'Transaction Failed',
          message: error.message || 'Failed to create game. Please try again.',
          type: 'error'
        });
      }
      return null;
    } finally {
      setIsProcessing(false);
      setProgressMessage(null);
    }
  }, [currentProvider, walletAddress, balance, showAlert]);

  const joinGame = useCallback(async (gameId: number, wagerAmount: number) => {
    if (!currentProvider || !walletAddress) {
      showAlert({
        title: 'Wallet Required',
        message: 'Please connect your wallet to join a game',
        type: 'error'
      });
      return null;
    }

    // Check balance
    if (balance < wagerAmount) {
      showAlert({
        title: 'Insufficient Balance',
        message: `You need at least ${wagerAmount} SOL to join this game`,
        type: 'error'
      });
      return null;
    }

    // Check if player can join
    const canJoin = await gameEscrowService.canPlayerJoin(walletAddress);
    if (!canJoin) {
      showAlert({
        title: 'Cannot Join',
        message: 'You already have an active game. Complete it first.',
        type: 'error'
      });
      return null;
    }

    setIsProcessing(true);
    setProgressMessage('Opening wallet for approval...');

    try {
      const signature = await gameEscrowService.joinGame(
        gameId,
        wagerAmount,
        currentProvider,
        walletAddress
      );

      showAlert({
        title: 'Game Joined!',
        message: 'You have successfully joined the game',
        type: 'success'
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to join game', error);
      showAlert({
        title: 'Transaction Failed',
        message: error.message || 'Failed to join game. Please try again.',
        type: 'error'
      });
      return null;
    } finally {
      setIsProcessing(false);
      setProgressMessage(null);
    }
  }, [currentProvider, walletAddress, balance, showAlert]);

  const cancelGame = useCallback(async (gameId: number) => {
    if (!currentProvider || !walletAddress) {
      showAlert({
        title: 'Wallet Required',
        message: 'Please connect your wallet',
        type: 'error'
      });
      return null;
    }

    setIsProcessing(true);
    setProgressMessage('Processing refund...');

    try {
      const signature = await gameEscrowService.cancelGame(
        gameId,
        currentProvider,
        walletAddress
      );

      showAlert({
        title: 'Game Cancelled',
        message: 'Your game has been cancelled and wager refunded',
        type: 'success'
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to cancel game', error);
      showAlert({
        title: 'Transaction Failed',
        message: error.message || 'Failed to cancel game. Please try again.',
        type: 'error'
      });
      return null;
    } finally {
      setIsProcessing(false);
      setProgressMessage(null);
    }
  }, [currentProvider, walletAddress, showAlert]);

  const updateMoveTime = useCallback(async (gameId: number) => {
    if (!currentProvider || !walletAddress) {
      return null;
    }

    try {
      const signature = await gameEscrowService.updateMoveTime(gameId, currentProvider);
      return signature;
    } catch (error) {
      logger.error('Failed to update move time', error);
      return null;
    }
  }, [currentProvider, walletAddress]);

  return {
    createGame,
    joinGame,
    cancelGame,
    updateMoveTime,
    isProcessing,
    progressMessage,
    canPlayerJoin: gameEscrowService.canPlayerJoin.bind(gameEscrowService),
    getGameState: gameEscrowService.getGameState.bind(gameEscrowService),
  };
}