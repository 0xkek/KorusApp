import { logger } from '../utils/logger';
import prisma from '../config/database';
import { gameEscrowService } from './gameEscrowService';

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
   * Start periodic checks for expired games (runs every minute)
   */
  startPeriodicCheck(): NodeJS.Timeout {
    logger.info('Starting periodic game expiration checks (every 60 seconds)');

    // Run immediately
    this.processExpiredGames();

    // Then run every minute
    return setInterval(() => {
      this.processExpiredGames();
    }, 60 * 1000); // 60 seconds
  }
}

export const gameExpirationService = new GameExpirationService();
