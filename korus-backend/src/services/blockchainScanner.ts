import { Connection, PublicKey, ParsedTransactionWithMeta, clusterApiUrl } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { PLATFORM_CONFIG } from '../config/platform';
import prisma from '../config/database';
import { getWeekDates } from '../utils/dateHelpers';

const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

export class BlockchainScanner {
  /**
   * Scan platform wallet for ALLY token transfers received this week
   */
  async scanWeeklyRevenue(): Promise<{
    sponsoredPostRevenue: number;
    gameRevenue: number;
    eventRevenue: number;
    totalRevenue: number;
  }> {
    try {
      const platformWallet = new PublicKey(PLATFORM_CONFIG.PLATFORM_WALLET_ADDRESS);
      const allyMint = new PublicKey(PLATFORM_CONFIG.ALLY_TOKEN_MINT);
      
      // Get this week's date range
      const { weekStart, weekEnd } = getWeekDates(new Date());
      const weekStartTimestamp = Math.floor(weekStart.getTime() / 1000);
      const weekEndTimestamp = Math.floor(weekEnd.getTime() / 1000);
      
      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(
        platformWallet,
        { limit: 1000 }, // Adjust based on expected volume
      );
      
      let sponsoredPostRevenue = 0;
      let gameRevenue = 0;
      let eventRevenue = 0;
      
      // Process each transaction
      for (const sig of signatures) {
        try {
          const tx = await connection.getParsedTransaction(
            sig.signature,
            { maxSupportedTransactionVersion: 0 }
          );
          
          if (!tx || !tx.blockTime) continue;
          
          // Skip if outside this week
          if (tx.blockTime < weekStartTimestamp || tx.blockTime > weekEndTimestamp) {
            continue;
          }
          
          // Look for token transfers to platform wallet
          const tokenTransfers = this.extractTokenTransfers(tx, platformWallet, allyMint);
          
          for (const transfer of tokenTransfers) {
            // Check memo or instruction data to categorize revenue
            const category = this.categorizeRevenue(tx);
            
            switch (category) {
              case 'sponsored':
                sponsoredPostRevenue += transfer.amount;
                break;
              case 'game':
                gameRevenue += transfer.amount;
                break;
              case 'event':
                eventRevenue += transfer.amount;
                break;
            }
          }
        } catch (error) {
          logger.error(`Error processing transaction ${sig.signature}:`, error);
        }
      }
      
      const totalRevenue = sponsoredPostRevenue + gameRevenue + eventRevenue;
      
      logger.info('Weekly revenue scan complete:', {
        sponsoredPostRevenue,
        gameRevenue,
        eventRevenue,
        totalRevenue
      });
      
      return {
        sponsoredPostRevenue,
        gameRevenue,
        eventRevenue,
        totalRevenue
      };
    } catch (error) {
      logger.error('Blockchain scanner error:', error);
      throw error;
    }
  }
  
  /**
   * Extract ALLY token transfers from transaction
   */
  private extractTokenTransfers(
    tx: ParsedTransactionWithMeta,
    platformWallet: PublicKey,
    allyMint: PublicKey
  ): Array<{ amount: number; from: string }> {
    const transfers: Array<{ amount: number; from: string }> = [];
    
    if (!tx.meta || !tx.transaction) return transfers;
    
    // Look through all instructions
    for (const instruction of tx.transaction.message.instructions) {
      if ('parsed' in instruction && instruction.parsed) {
        // Check for SPL token transfers
        if (
          instruction.program === 'spl-token' &&
          instruction.parsed.type === 'transferChecked'
        ) {
          const info = instruction.parsed.info;
          
          // Check if it's ALLY token transfer to platform
          if (
            info.mint === allyMint.toBase58() &&
            info.destination === platformWallet.toBase58()
          ) {
            transfers.push({
              amount: info.tokenAmount.uiAmount || 0,
              from: info.source
            });
          }
        }
      }
    }
    
    return transfers;
  }
  
  /**
   * Categorize revenue based on transaction memo or program
   */
  private categorizeRevenue(tx: ParsedTransactionWithMeta): 'sponsored' | 'game' | 'event' | 'unknown' {
    // Look for memo instruction
    const memoInstruction = tx.transaction.message.instructions.find(
      (ix) => 'parsed' in ix && ix.program === 'spl-memo'
    );
    
    if (memoInstruction && 'parsed' in memoInstruction) {
      const memo = memoInstruction.parsed;
      
      // Check memo content for category
      if (memo.includes('sponsored') || memo.includes('ad')) {
        return 'sponsored';
      } else if (memo.includes('game') || memo.includes('wager')) {
        return 'game';
      } else if (memo.includes('event') || memo.includes('ticket')) {
        return 'event';
      }
    }
    
    // Could also check for specific program IDs here
    // For now, default to sponsored
    return 'sponsored';
  }
  
  /**
   * Update weekly pool with on-chain revenue
   */
  async updateWeeklyPoolRevenue(): Promise<void> {
    const revenue = await this.scanWeeklyRevenue();
    const { weekStart } = getWeekDates(new Date());
    
    await prisma.weeklyRepPool.upsert({
      where: { weekStartDate: weekStart },
      create: {
        weekStartDate: weekStart,
        weekEndDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
        distributionDate: new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000),
        sponsoredPostRevenue: revenue.sponsoredPostRevenue,
        gameFeesCollected: revenue.gameRevenue,
        eventFeesCollected: revenue.eventRevenue,
        totalPoolSize: revenue.totalRevenue * (PLATFORM_CONFIG.DISTRIBUTION_PERCENT / 100)
      },
      update: {
        sponsoredPostRevenue: revenue.sponsoredPostRevenue,
        gameFeesCollected: revenue.gameRevenue,
        eventFeesCollected: revenue.eventRevenue,
        totalPoolSize: revenue.totalRevenue * (PLATFORM_CONFIG.DISTRIBUTION_PERCENT / 100)
      }
    });
  }
}

export const blockchainScanner = new BlockchainScanner();