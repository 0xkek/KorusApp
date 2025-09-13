// Environment configuration for Korus app
// This file centralizes all environment-specific settings

export type Environment = 'development' | 'staging' | 'production';

// Get current environment from env variable or default to production for safety
const ENV: Environment = (process.env.EXPO_PUBLIC_ENVIRONMENT as Environment) || 'production';

interface EnvironmentConfig {
  // API Configuration
  apiUrl: string;
  
  // Solana Configuration
  solanaCluster: 'solana:devnet' | 'solana:testnet' | 'solana:mainnet-beta';
  solanaRpcUrl: string;
  gameEscrowProgramId: string;
  
  // Feature Flags
  // Demo and mock features removed for production
  smartContractsEnabled: boolean;
  
  // Token Configuration
  allyTokenAddress?: string;
  allyTokenDecimals: number;
  
  // Game Configuration
  minWagerAmount: number;
  maxWagerAmount: number;
  gameTimeoutMs: number;
  
  // App Configuration
  appName: string;
  appUrl: string;
  
  // Third Party Services
  heliusApiKey?: string;
  sentryDsn?: string;
  
  // Debug Settings
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    // API
    apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
    
    // Solana
    solanaCluster: 'solana:devnet',
    solanaRpcUrl: 'https://api.devnet.solana.com',
    gameEscrowProgramId: '9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG',
    
    // Features - production only
    smartContractsEnabled: false,
    
    // Token
    allyTokenAddress: undefined, // Using devnet tokens
    allyTokenDecimals: 9,
    
    // Game
    minWagerAmount: 1,
    maxWagerAmount: 10000,
    gameTimeoutMs: 300000, // 5 minutes
    
    // App
    appName: 'Korus (Dev)',
    appUrl: 'https://korus-dev.app',
    
    // Services
    heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
    sentryDsn: undefined,
    
    // Debug
    enableLogging: true,
    logLevel: 'debug',
  },
  
  staging: {
    // API
    apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
    
    // Solana
    solanaCluster: 'solana:devnet',
    solanaRpcUrl: 'https://api.devnet.solana.com',
    gameEscrowProgramId: '9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG',
    
    // Features - production only
    smartContractsEnabled: false,
    
    // Token
    allyTokenAddress: undefined, // Using testnet tokens
    allyTokenDecimals: 9,
    
    // Game
    minWagerAmount: 10,
    maxWagerAmount: 5000,
    gameTimeoutMs: 300000, // 5 minutes
    
    // App
    appName: 'Korus (Staging)',
    appUrl: 'https://korus-staging.app',
    
    // Services
    heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    
    // Debug
    enableLogging: true,
    logLevel: 'info',
  },
  
  production: {
    // API
    apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
    
    // Solana  (Using devnet for testing)
    solanaCluster: 'solana:devnet',
    solanaRpcUrl: 'https://api.devnet.solana.com',
    gameEscrowProgramId: '9rLXaB3a8qeb55N119sC3mjK58LyPeXXnj8vEvm3EWFG',
    
    // Features - production only
    smartContractsEnabled: false,
    
    // Token (TODO: Add actual ALLY token address when deployed)
    allyTokenAddress: process.env.EXPO_PUBLIC_ALLY_TOKEN_ADDRESS,
    allyTokenDecimals: 9,
    
    // Game
    minWagerAmount: 10,
    maxWagerAmount: 1000,
    gameTimeoutMs: 300000, // 5 minutes
    
    // App
    appName: 'Korus',
    appUrl: 'https://korus.app',
    
    // Services
    heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    
    // Debug
    enableLogging: false,
    logLevel: 'error',
  },
};

// Export the current environment config
export const config = configs[ENV];

// Export current environment
export const currentEnvironment = ENV;

// Helper to check if we're in production
export const isProduction = ENV === 'production';

// Helper to check if we're in development
export const isDevelopment = ENV === 'development';

// Log environment on app start for debugging (development only)
if (isDevelopment && config.enableLogging) {
  console.log('🌍 Environment:', ENV);
  console.log('📡 API URL:', config.apiUrl);
  console.log('⛓️ Solana Cluster:', config.solanaCluster);
  console.log('📱 App Name:', config.appName);
}