import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getWeekDates, isFriday } from '../utils/dateHelpers';
import { blockchainScanner } from './blockchainScanner';
import { PLATFORM_CONFIG, getPlatformKeypair } from '../config/platform';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

const prisma = new PrismaClient();
const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

export class DistributionService {
  /**
   * Run the weekly distribution (should be called on Fridays)
   */
  async runWeeklyDistribution(): Promise<void> {
    try {
      const now = new Date();
      
      // Safety check - only run on Fridays
      if (!isFriday(now)) {
        logger.warn('Weekly distribution attempted on non-Friday');
        return;
      }

      const { weekStart, weekEnd } = getWeekDates(now);
      
      // First, scan blockchain for this week's revenue
      logger.info('Scanning blockchain for weekly revenue...');
      await blockchainScanner.updateWeeklyPoolRevenue();
      
      // Get or create the weekly pool
      let pool = await prisma.weeklyRepPool.findUnique({
        where: { weekStartDate: weekStart }
      });

      if (!pool) {
        logger.error('No weekly pool found for distribution');
        return;
      }

      if (pool.distributed) {
        logger.warn('Weekly distribution already completed');
        return;
      }

      // Calculate total revenue and splits
      const totalRevenue = 
        pool.sponsoredPostRevenue.toNumber() + 
        pool.gameFeesCollected.toNumber() + 
        pool.eventFeesCollected.toNumber();
      
      // Calculate splits
      const userPoolSize = totalRevenue * (PLATFORM_CONFIG.DISTRIBUTION_PERCENT / 100); // 50%
      const teamShare = totalRevenue * (PLATFORM_CONFIG.TEAM_FEE_PERCENT / 100); // 45%
      const operationsShare = totalRevenue * (PLATFORM_CONFIG.OPERATIONS_FEE_PERCENT / 100); // 5%
      
      logger.info('Revenue distribution breakdown:', {
        totalRevenue,
        userPool: userPoolSize,
        teamShare,
        operationsShare
      });
      
      // Check minimum pool size
      if (userPoolSize < PLATFORM_CONFIG.MIN_POOL_SIZE) {
        logger.warn(`User pool size ${userPoolSize} is below minimum ${PLATFORM_CONFIG.MIN_POOL_SIZE}`);
        return;
      }
      
      // Get platform keypair for sending transactions
      const platformKeypair = getPlatformKeypair();
      if (!platformKeypair) {
        logger.error('Platform keypair not configured');
        return;
      }

      // Send team share first
      try {
        const teamTxSignature = await this.sendTokensToTeam(teamShare, platformKeypair);
        logger.info(`Sent ${teamShare} ALLY to team wallet (tx: ${teamTxSignature})`);
      } catch (error) {
        logger.error('Failed to send team share:', error);
        // Continue with user distribution even if team transfer fails
      }

      // Get all users who earned reputation this week
      const eligibleUsers = await prisma.user.findMany({
        where: {
          weeklyRepEarned: { gt: 0 },
          weekStartDate: weekStart,
          isSuspended: false
        },
        orderBy: { weeklyRepEarned: 'desc' }
      });

      if (eligibleUsers.length === 0) {
        logger.warn('No eligible users for distribution');
        return;
      }

      // Calculate total reputation earned this week
      const totalRepEarned = eligibleUsers.reduce(
        (sum, user) => sum + user.weeklyRepEarned, 
        0
      );

      // Create distribution records and send tokens
      const distributions = [];
      const failedTransfers = [];
      
      for (const user of eligibleUsers) {
        const sharePercentage = (user.weeklyRepEarned / totalRepEarned) * 100;
        const tokensEarned = Math.floor((user.weeklyRepEarned / totalRepEarned) * userPoolSize);
        
        // Skip if below minimum earning
        if (tokensEarned < PLATFORM_CONFIG.MIN_USER_EARNING) {
          logger.info(`User ${user.walletAddress} earned ${tokensEarned} ALLY, below minimum`);
          continue;
        }

        try {
          // Send ALLY tokens to user
          const txSignature = await this.sendTokensToUser(
            user.walletAddress,
            tokensEarned,
            platformKeypair
          );

          // Create distribution record
          const distribution = await prisma.tokenDistribution.create({
            data: {
              userWallet: user.walletAddress,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              distributionDate: now,
              repEarned: user.weeklyRepEarned,
              sharePercentage,
              tokensEarned,
              weeklyPoolSize: userPoolSize,
              totalParticipants: eligibleUsers.length,
              claimed: true, // Marked as claimed since we sent it
              claimedAt: now
            }
          });
          
          distributions.push(distribution);
          logger.info(`Sent ${tokensEarned} ALLY to ${user.walletAddress} (tx: ${txSignature})`);
          
        } catch (error) {
          logger.error(`Failed to send tokens to ${user.walletAddress}:`, error);
          failedTransfers.push({ wallet: user.walletAddress, amount: tokensEarned, error });
        }
      }

      // Update the pool as distributed
      await prisma.weeklyRepPool.update({
        where: { weekStartDate: weekStart },
        data: {
          totalPoolSize: userPoolSize,
          totalRepGenerated: totalRepEarned,
          participantCount: eligibleUsers.length,
          distributed: true,
          distributedAt: now
        }
      });

      // Reset weekly reputation for all participating users
      await prisma.user.updateMany({
        where: {
          weekStartDate: weekStart,
          weeklyRepEarned: { gt: 0 }
        },
        data: {
          weeklyRepEarned: 0
        }
      });

      logger.info(`Weekly distribution completed: ${userPoolSize} ALLY distributed to ${eligibleUsers.length} users`);
      
      // Log top earners
      const topEarners = distributions.slice(0, 5);
      topEarners.forEach((dist, index) => {
        logger.info(`  ${index + 1}. ${dist.userWallet.slice(0, 8)}... earned ${dist.tokensEarned} ALLY (${dist.sharePercentage.toFixed(2)}%)`);
      });

    } catch (error) {
      logger.error('Weekly distribution error:', error);
      throw error;
    }
  }

  /**
   * Get distribution stats for a specific week
   */
  async getWeeklyStats(weekStartDate: Date) {
    const pool = await prisma.weeklyRepPool.findUnique({
      where: { weekStartDate }
    });

    const distributions = await prisma.tokenDistribution.findMany({
      where: { weekStartDate },
      orderBy: { tokensEarned: 'desc' },
      take: 100 // Top 100 earners
    });

    return {
      pool,
      distributions,
      totalDistributed: pool?.totalPoolSize || 0,
      participantCount: pool?.participantCount || 0
    };
  }

  /**
   * Send team share to team wallet
   */
  private async sendTokensToTeam(
    amount: number,
    platformKeypair: any
  ): Promise<string> {
    try {
      const teamPubkey = new PublicKey(PLATFORM_CONFIG.TEAM_WALLET_ADDRESS);
      const platformPubkey = platformKeypair.publicKey;
      const mintPubkey = new PublicKey(PLATFORM_CONFIG.ALLY_TOKEN_MINT);
      
      // Get token accounts
      const platformTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        platformPubkey
      );
      
      const teamTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        teamPubkey
      );
      
      // Create transfer instruction
      const transferIx = createTransferCheckedInstruction(
        platformTokenAccount,
        mintPubkey,
        teamTokenAccount,
        platformPubkey,
        amount * 1e6, // Convert to smallest unit (assuming 6 decimals)
        6 // ALLY token decimals
      );
      
      // Create and send transaction
      const transaction = new Transaction().add(transferIx);
      
      // Add memo for tracking
      const memoIx = {
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(`Korus team share - Week ${new Date().toISOString()}`)
      };
      transaction.add(memoIx);
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [platformKeypair]
      );
      
      return signature;
    } catch (error) {
      logger.error('Team token transfer error:', error);
      throw error;
    }
  }

  /**
   * Send ALLY tokens from platform wallet to user
   */
  private async sendTokensToUser(
    userWallet: string,
    amount: number,
    platformKeypair: any
  ): Promise<string> {
    try {
      const userPubkey = new PublicKey(userWallet);
      const platformPubkey = platformKeypair.publicKey;
      const mintPubkey = new PublicKey(PLATFORM_CONFIG.ALLY_TOKEN_MINT);
      
      // Get token accounts
      const platformTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        platformPubkey
      );
      
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        userPubkey
      );
      
      // Create transfer instruction
      const transferIx = createTransferCheckedInstruction(
        platformTokenAccount,
        mintPubkey,
        userTokenAccount,
        platformPubkey,
        amount * 1e6, // Convert to smallest unit (assuming 6 decimals)
        6 // ALLY token decimals
      );
      
      // Create and send transaction
      const transaction = new Transaction().add(transferIx);
      
      // Add memo for tracking
      const memoIx = {
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(`Korus weekly distribution - Week ${new Date().toISOString()}`)
      };
      transaction.add(memoIx);
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [platformKeypair]
      );
      
      return signature;
    } catch (error) {
      logger.error('Token transfer error:', error);
      throw error;
    }
  }

  /**
   * Allow users to claim their tokens (integrate with smart contract)
   */
  async claimTokens(userWallet: string, weekStartDate: Date) {
    const distribution = await prisma.tokenDistribution.findUnique({
      where: {
        userWallet_weekStartDate: {
          userWallet,
          weekStartDate
        }
      }
    });

    if (!distribution) {
      throw new Error('No distribution found for this week');
    }

    if (distribution.claimed) {
      throw new Error('Tokens already claimed');
    }

    // TODO: Integrate with Solana smart contract to transfer tokens
    // For now, just mark as claimed
    
    await prisma.tokenDistribution.update({
      where: {
        userWallet_weekStartDate: {
          userWallet,
          weekStartDate
        }
      },
      data: {
        claimed: true,
        claimedAt: new Date()
      }
    });

    return distribution;
  }
}

export const distributionService = new DistributionService();