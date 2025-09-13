import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { logger } from '../utils/logger';

/**
 * Game Authority Configuration
 * This wallet controls game completions and dispute resolution
 */
export const GAME_AUTHORITY_CONFIG = {
  // Authority wallet public address
  AUTHORITY_WALLET_ADDRESS: process.env.AUTHORITY_WALLET_ADDRESS || '',
  
  // Authority wallet private key (keep secure!)
  AUTHORITY_PRIVATE_KEY: process.env.AUTHORITY_PRIVATE_KEY,
};

/**
 * Get authority wallet keypair for signing game completion transactions
 */
export function getAuthorityKeypair(): Keypair | null {
  if (!GAME_AUTHORITY_CONFIG.AUTHORITY_PRIVATE_KEY) {
    logger.error('Authority wallet private key not configured');
    logger.info('Add AUTHORITY_PRIVATE_KEY to environment variables');
    return null;
  }
  
  try {
    const privateKey = bs58.decode(GAME_AUTHORITY_CONFIG.AUTHORITY_PRIVATE_KEY);
    const keypair = Keypair.fromSecretKey(privateKey);
    
    // Verify the public key matches
    if (GAME_AUTHORITY_CONFIG.AUTHORITY_WALLET_ADDRESS) {
      const expectedPubkey = new PublicKey(GAME_AUTHORITY_CONFIG.AUTHORITY_WALLET_ADDRESS);
      if (!keypair.publicKey.equals(expectedPubkey)) {
        logger.error('Authority keypair public key mismatch!');
        return null;
      }
    }
    
    return keypair;
  } catch (error) {
    logger.error('Invalid authority wallet private key:', error);
    return null;
  }
}

/**
 * Check if authority wallet is properly configured
 */
export function isAuthorityConfigured(): boolean {
  return !!(
    GAME_AUTHORITY_CONFIG.AUTHORITY_WALLET_ADDRESS &&
    GAME_AUTHORITY_CONFIG.AUTHORITY_PRIVATE_KEY &&
    getAuthorityKeypair()
  );
}