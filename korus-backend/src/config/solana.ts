import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Contract configuration
export const GAME_ESCROW_PROGRAM_ID = new PublicKey('4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd');
export const TREASURY_WALLET = new PublicKey('ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W');

// RPC Configuration - Games are on devnet for testing
export const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const connection = new Connection(RPC_URL, 'confirmed');

// Authority keypair for completing games
let authorityKeypair: Keypair;

// Load authority keypair from environment or file
export function loadAuthorityKeypair(): Keypair {
  if (authorityKeypair) return authorityKeypair;

  // Try to load from environment variable first
  if (process.env.SOLANA_AUTHORITY_KEY) {
    try {
      const secretKey = JSON.parse(process.env.SOLANA_AUTHORITY_KEY);
      authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      logger.info('✅ Loaded authority keypair from environment');
      logger.info('Authority pubkey:', authorityKeypair.publicKey.toString());
      return authorityKeypair;
    } catch (e) {
      logger.error('Failed to load authority from env:', e);
    }
  }

  // Try to load from file
  const keypairPath = process.env.SOLANA_AUTHORITY_KEYPAIR_PATH || 
    path.join(process.cwd(), 'authority-keypair.json');
  
  if (fs.existsSync(keypairPath)) {
    try {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      logger.info('✅ Loaded authority keypair from file:', keypairPath);
      logger.info('Authority pubkey:', authorityKeypair.publicKey.toString());
      return authorityKeypair;
    } catch (e) {
      logger.error('Failed to load authority from file:', e);
    }
  }

  // Generate a new keypair if none exists (ONLY FOR DEVELOPMENT)
  logger.warn('⚠️  No authority keypair found, generating new one...');
  logger.warn('⚠️  THIS SHOULD ONLY HAPPEN IN DEVELOPMENT!');

  authorityKeypair = Keypair.generate();
  const keypairData = Array.from(authorityKeypair.secretKey);

  // Save to file for future use
  fs.writeFileSync(keypairPath, JSON.stringify(keypairData));
  logger.info('💾 Saved new authority keypair to:', keypairPath);
  logger.info('🔑 Authority pubkey:', authorityKeypair.publicKey.toString());
  logger.warn('\n⚠️  IMPORTANT: You must initialize the smart contract with this authority!');
  logger.info('Run: npm run init-contract');
  
  return authorityKeypair;
}

// Get provider for Anchor
export function getProvider(): anchor.AnchorProvider {
  const authority = loadAuthorityKeypair();
  const wallet = new anchor.Wallet(authority);
  return new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
}

// Initialize on module load
loadAuthorityKeypair();