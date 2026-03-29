import { logger } from '../utils/logger';
import prisma from '../config/database';
import { gameEscrowService } from './gameEscrowService';
import { emitGameCompleted } from '../config/socket';
import { createNotification } from '../utils/notifications';

// Move timeout: 10 minutes (matches on-chain MOVE_TIMEOUT_SECONDS = 600)
const MOVE_TIMEOUT_MS = 10 * 60 * 1000;

export class GameExpirationService {
  /**
   * Check for expired waiting games and cancel them with refunds
   */
  async processExpiredGames(): Promise<void> {
    try {
      const now = new Date();

      // Find all waiting games that have expired
      const expiredGames = await prisma.game.findMany({
        where: {
          status: 'waiting',
          expiresAt: {
            lte: now
          }
        },
        include: {
          escrow: true
        }
      });

      if (expiredGames.length === 0) {
        logger.debug('No expired games found');
        return;
      }

      logger.info(`Found ${expiredGames.length} expired games to process`);

      for (const game of expiredGames) {
        try {
          logger.info(`Processing expired game: ${game.id}, onChainGameId: ${game.onChainGameId}`);

          // If game has blockchain component, cancel on-chain and refund
          if (game.onChainGameId) {
            try {
              // Use authority cancellation (doesn't require player1 signature)
              const result = await gameEscrowService.authorityCancelExpiredGame(Number(game.onChainGameId));

              if (result.success) {
                logger.info(`✅ Successfully cancelled on-chain game ${game.onChainGameId} and refunded player (signature: ${result.signature})`);
              } else {
                logger.error(`❌ Failed to cancel on-chain game ${game.onChainGameId}: ${result.error}`);
              }
            } catch (error) {
              logger.error(`Error cancelling on-chain game ${game.onChainGameId}:`, error);
            }
          }

          // Update game status to cancelled
          await prisma.game.update({
            where: { id: game.id },
            data: {
              status: 'cancelled',
              winner: null
            }
          });

          logger.info(`Game ${game.id} marked as cancelled`);

        } catch (error) {
          logger.error(`Error processing expired game ${game.id}:`, error);
        }
      }

      logger.info(`Processed ${expiredGames.length} expired games`);
    } catch (error) {
      logger.error('Error in processExpiredGames:', error);
      throw error;
    }
  }

  /**
   * Check for active games where a player has timed out on their move (10 min)
   */
  async processMoveTimeouts(): Promise<void> {
    try {
      const timeoutThreshold = new Date(Date.now() - MOVE_TIMEOUT_MS);

      // Find active games where lastMoveAt is older than 10 minutes
      const timedOutGames = await prisma.game.findMany({
        where: {
          status: 'active',
          lastMoveAt: {
            lte: timeoutThreshold
          }
        },
        include: {
          player1User: true,
          player2User: true
        }
      });

      if (timedOutGames.length === 0) {
        return;
      }

      logger.info(`Found ${timedOutGames.length} active games with move timeouts`);

      for (const game of timedOutGames) {
        try {
          if (!game.player2) continue; // Shouldn't happen for active games, but safety check

          // The player whose turn it is timed out — the other player wins
          // For RPS (no currentTurn), we can't determine who timed out from turn alone,
          // so we check who has NOT yet submitted a move this round
          let timeoutWinner: string;

          if (game.currentTurn) {
            // Turn-based games (tictactoe, connectfour): currentTurn player timed out
            timeoutWinner = game.currentTurn === game.player1 ? game.player2 : game.player1;
          } else {
            // RPS: both players submit simultaneously. If timed out, the game is stuck.
            // Award win to player1 as a tiebreaker (both failed to move)
            const gameState = game.gameState as any;
            const playerMoves = (gameState?.playerMoves || {}) as Record<string, string>;
            if (playerMoves[game.player1] && !playerMoves[game.player2]) {
              timeoutWinner = game.player1; // player2 didn't submit
            } else if (!playerMoves[game.player1] && playerMoves[game.player2]) {
              timeoutWinner = game.player2; // player1 didn't submit
            } else {
              // Both submitted or neither submitted — cancel the game instead
              logger.info(`RPS game ${game.id} timed out with ambiguous state, cancelling`);
              await prisma.game.update({
                where: { id: game.id },
                data: { status: 'cancelled', currentTurn: null }
              });
              continue;
            }
          }

          logger.info(`Move timeout: Game ${game.id}, winner: ${timeoutWinner}`);

          // Update game as completed with timeout winner
          const updatedGame = await prisma.game.update({
            where: { id: game.id },
            data: {
              winner: timeoutWinner,
              status: 'completed',
              currentTurn: null
            }
          });

          // Trigger on-chain payout if applicable
          if (updatedGame.onChainGameId) {
            try {
              const result = await gameEscrowService.completeGame(
                Number(updatedGame.onChainGameId),
                timeoutWinner
              );
              if (result.success) {
                logger.info(`✅ Timeout payout successful for game ${game.id}`);
              } else {
                logger.error(`❌ Timeout payout failed for game ${game.id}: ${result.error}`);
              }
            } catch (error) {
              logger.error(`Error processing timeout payout for game ${game.id}:`, error);
            }
          }

          // Emit game completed event
          emitGameCompleted(game.player1, game.player2, {
            ...updatedGame,
            onChainGameId: updatedGame.onChainGameId ? updatedGame.onChainGameId.toString() : null,
            wager: updatedGame.wager.toString(),
            player1DisplayName: game.player1User?.username || game.player1User?.snsUsername || null,
            player2DisplayName: game.player2User?.username || game.player2User?.snsUsername || null
          });

          // Notify both players about timeout completion
          const wagerAmount = Number(updatedGame.wager);
          createNotification({
            userId: game.player1,
            type: 'game_completed',
            fromUserId: game.player2,
            amount: wagerAmount > 0 ? wagerAmount : undefined,
          }).catch(() => {});
          createNotification({
            userId: game.player2,
            type: 'game_completed',
            fromUserId: game.player1,
            amount: wagerAmount > 0 ? wagerAmount : undefined,
          }).catch(() => {});

          logger.info(`Game ${game.id} completed by move timeout. Winner: ${timeoutWinner}`);
        } catch (error) {
          logger.error(`Error processing move timeout for game ${game.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in processMoveTimeouts:', error);
    }
  }

  /**
   * Start periodic checks for expired games (runs every minute)
   */
  startPeriodicCheck(): NodeJS.Timeout {
    logger.info('Starting periodic game expiration checks (every 60 seconds)');

    // Run immediately
    this.processExpiredGames();
    this.processMoveTimeouts();

    // Then run every minute
    return setInterval(() => {
      this.processExpiredGames();
      this.processMoveTimeouts();
    }, 60 * 1000); // 60 seconds
  }
}

export const gameExpirationService = new GameExpirationService();
