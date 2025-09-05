import { logger } from '../utils/logger'
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export const PLATFORM_CONFIG = {
  // Platform wallet that receives sponsored post payments
  PLATFORM_WALLET_ADDRESS: process.env.PLATFORM_WALLET_ADDRESS || '',
  
  // Platform wallet private key for distributions (keep secure!)
  PLATFORM_WALLET_PRIVATE_KEY: process.env.PLATFORM_WALLET_PRIVATE_KEY,
  
  // ALLY token mint address
  ALLY_TOKEN_MINT: process.env.ALLY_TOKEN_MINT || '',
  
  // Distribution settings
  PLATFORM_FEE_PERCENT: 50, // Platform keeps 50% total
  DISTRIBUTION_PERCENT: 50, // 50% distributed to users
  OPERATIONS_FEE_PERCENT: 5, // 5% stays in platform wallet for operations
  TEAM_FEE_PERCENT: 45, // 45% goes to team wallet
  
  // Team wallet that receives 45% of revenue
  TEAM_WALLET_ADDRESS: process.env.TEAM_WALLET_ADDRESS || '',
  
  // Minimum amounts
  MIN_POOL_SIZE: 1000, // Minimum 1000 ALLY to trigger distribution
  MIN_USER_EARNING: 10, // Users must earn at least 10 ALLY to receive distribution
};

/**
 * Get platform wallet keypair for signing transactions
 */
export function getPlatformKeypair(): Keypair | null {
  if (!PLATFORM_CONFIG.PLATFORM_WALLET_PRIVATE_KEY) {
    logger.error('Platform wallet private key not configured');
    return null;
  }
  
  try {
    const privateKey = bs58.decode(PLATFORM_CONFIG.PLATFORM_WALLET_PRIVATE_KEY);
    return Keypair.fromSecretKey(privateKey);
  } catch (error) {
    logger.error('Invalid platform wallet private key:', error);
    return null;
  }
}