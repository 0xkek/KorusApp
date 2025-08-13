import { PublicKey } from '@solana/web3.js';
import { config } from '../../config/environment';

// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
export const CONTRACT_ADDRESSES = {
  devnet: {
    gameEscrow: 'DEVNET_GAME_ESCROW_PROGRAM_ID',
    tipping: 'DEVNET_TIPPING_PROGRAM_ID',
    treasury: 'DEVNET_TREASURY_ADDRESS',
  },
  'mainnet-beta': {
    gameEscrow: 'MAINNET_GAME_ESCROW_PROGRAM_ID',
    tipping: 'MAINNET_TIPPING_PROGRAM_ID',
    treasury: 'MAINNET_TREASURY_ADDRESS',
  },
};

// Get current network addresses
export const getContractAddresses = () => {
  const network = config.solanaCluster.includes('mainnet') ? 'mainnet-beta' : 'devnet';
  return CONTRACT_ADDRESSES[network];
};

// Token configuration
export const TOKEN_CONFIG = {
  // Using wrapped SOL for now, can switch to USDC later
  mint: new PublicKey('So11111111111111111111111111111111111111112'),
  decimals: 9,
  symbol: 'SOL',
};

// Contract limits
export const GAME_LIMITS = {
  minWager: 0.1, // SOL
  maxWager: 10, // SOL
  platformFeeBps: 250, // 2.5%
  expiryHours: 24,
};

export const TIP_LIMITS = {
  minTip: 0.001, // SOL
  platformFeeBps: 100, // 1%
};