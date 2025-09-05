/**
 * Application constants and configuration values
 * These can be overridden by environment variables
 */

// Token configuration
export const TOKEN_CONFIG = {
  INITIAL_ALLY_BALANCE: Number(process.env.INITIAL_ALLY_BALANCE || 5000),
  ENABLE_TOKEN_FEATURES: process.env.ENABLE_TOKEN_FEATURES === 'true'
}

// NFT configuration
export const NFT_CONFIG = {
  // Verified NFT collection names on Solana (used for spam filtering)
  VERIFIED_COLLECTIONS: process.env.VERIFIED_NFT_COLLECTIONS 
    ? process.env.VERIFIED_NFT_COLLECTIONS.split(',').map(s => s.trim())
    : [
      'DeGods',
      'y00ts',
      'Okay Bears',
      'Mad Lads',
      'Claynosaurz',
      'SMB',
      'Famous Fox Federation',
      'Tensorians',
      'Bored Ape Solana',
      'Drip Haus',
      'Genesis Token'
    ]
}

// SNS Domain configuration  
export const SNS_CONFIG = {
  // Hardcoded SNS domain mappings (for demo/testing)
  // Map wallet addresses to their SNS domains
  DEMO_DOMAINS: process.env.SNS_DEMO_DOMAINS
    ? JSON.parse(process.env.SNS_DEMO_DOMAINS)
    : {
      '5wUUXyrvNeBvvEmuZniMYLByS5Tya2NfgeJ1RnN4Rxo3': 'maxattard.sol',
      '7Z8Gfh3LJkJrNf2j5VvKnzQ9WmPQsXhRwYbKqTmHdFkP': 'korus.sol',
      'GvQW7V9rqBhxjRczBnfCBKCK2s5bfFhL2WbLz7KQtq1h': 'solana.sol',
      'J9X8RsRwmz5VKhq9tBcKnGZFdQJwYzQsXhRwYbKqTmHd': 'vitalik.sol',
      '9yPhbpqXRRhaSJPMUmYPKwaBWngtbV9Kx6d9zUeMb5zP': 'test.sol',
      'DemoWallet11111111111111111111111111111111': 'demo.sol',
      'ALiceWaLLet11111111111111111111111111111111': 'alice.sol',
      'BobWaLLet1111111111111111111111111111111111': 'bob.sol',
      'CharLieWaLLet111111111111111111111111111111': 'charlie.sol'
    },
  
  // Default domain for wallets not in mapping
  DEFAULT_DOMAIN: process.env.SNS_DEFAULT_DOMAIN || 'anonymous.sol',
  
  // SNS TLD authority (for mainnet)
  TLD_AUTHORITY: process.env.SNS_TLD_AUTHORITY || '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'
}

// Game configuration
export const GAME_CONFIG = {
  MAX_WAGER: Number(process.env.MAX_GAME_WAGER || 1000),
  MIN_WAGER: Number(process.env.MIN_GAME_WAGER || 0.01),
  PLATFORM_FEE_PERCENT: Number(process.env.GAME_PLATFORM_FEE || 2.5)
}

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Window in milliseconds
  WINDOW_MS: {
    API: 15 * 60 * 1000, // 15 minutes
    AUTH: 15 * 60 * 1000, // 15 minutes
    SEARCH: 60 * 1000, // 1 minute
    NFT: 60 * 1000, // 1 minute
    SNS: 60 * 1000, // 1 minute
    INTERACTION: 60 * 1000, // 1 minute
    REPORT: 60 * 60 * 1000, // 1 hour
    POST_CREATE: 30 * 1000, // 30 seconds
  },
  // Max requests per window
  MAX_REQUESTS: {
    API: 100,
    AUTH: 20,
    SEARCH: 100,
    NFT: 200,
    SNS: 200,
    INTERACTION: 60,
    REPORT: 10,
    POST_CREATE: 1,
    SPONSORED_TRACKING: 500
  }
}

// Pagination defaults
export const PAGINATION_CONFIG = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
}

// Platform configuration
export const PLATFORM_CONFIG = {
  // Platform wallet addresses
  TREASURY_WALLET: process.env.TREASURY_WALLET || 'ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W',
  DISTRIBUTION_WALLET: process.env.DISTRIBUTION_WALLET || '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY',
  
  // Platform fees
  PLATFORM_FEE_PERCENT: Number(process.env.PLATFORM_FEE_PERCENT || 50),
  
  // Weekly distribution
  ENABLE_WEEKLY_DISTRIBUTION: process.env.ENABLE_WEEKLY_DISTRIBUTION === 'true'
}

// Reputation configuration
export const REPUTATION_CONFIG = {
  // Points for different actions
  POINTS: {
    POST_CREATE: 10,
    POST_LIKE_RECEIVED: 2,
    POST_TIP_RECEIVED: 20,
    REPLY_CREATE: 5,
    REPLY_LIKE_RECEIVED: 1,
    GAME_WIN: 50,
    GAME_LOSS: 10,
    DAILY_LOGIN: 5,
    WEEKLY_STREAK: 25
  },
  
  // Multipliers
  MULTIPLIERS: {
    GENESIS_HOLDER: 2.0,
    PREMIUM_TIER: 1.5,
    STANDARD_TIER: 1.0
  }
}