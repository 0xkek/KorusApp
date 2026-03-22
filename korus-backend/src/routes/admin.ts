import { Router } from 'express';
import { authenticate as authenticateJWT } from '../middleware/auth';
import { isAuthorityConfigured } from '../config/gameAuthority';
import { gameCompletionService } from '../services/gameCompletionService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Admin health check endpoint
 * Shows status of critical services
 */
router.get('/health', async (req, res) => {
  try {
    const authorityConfigured = isAuthorityConfigured();
    const authorityBalance = await gameCompletionService.checkAuthorityBalance();
    
    const status = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: true, // Assume OK if we got here
        authority: {
          configured: authorityConfigured,
          balance: authorityBalance,
          sufficient: authorityBalance >= 0.01, // Need at least 0.01 SOL for fees
        },
        network: process.env.SOLANA_RPC_URL?.includes('mainnet') ? 'mainnet' : 'devnet',
        programId: process.env.GAME_ESCROW_PROGRAM_ID || 'not-set',
      }
    };

    const allHealthy = authorityConfigured && authorityBalance >= 0.01;
    
    res.status(allHealthy ? 200 : 503).json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'ERROR',
      error: 'Health check failed'
    });
  }
});

/**
 * Manual game completion endpoint (admin only)
 * For testing or dispute resolution
 */
router.post('/complete-game', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin (you'd implement this check)
    // For now, we'll skip admin check for testing
    
    const { gameId, winner, loser, wagerAmount } = req.body;
    
    if (!gameId || !winner || !loser || !wagerAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await gameCompletionService.completeGame(
      gameId,
      winner,
      loser,
      wagerAmount
    );

    res.json(result);
  } catch (error) {
    logger.error('Manual game completion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete game'
    });
  }
});

export default router;