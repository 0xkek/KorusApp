// Production-only environment configuration for Korus
// Simplified - no dev/staging environments

interface EnvironmentConfig {
  // API Configuration
  apiUrl: string;

  // Solana Configuration
  solanaCluster: 'solana:mainnet';
  solanaRpcUrl: string;
  gameEscrowProgramId: string;

  // Feature Flags
  smartContractsEnabled: boolean;

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

// Production configuration
export const config: EnvironmentConfig = {
  // API
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://korus-backend.onrender.com/api',

  // Solana - MAINNET ONLY
  solanaCluster: 'solana:mainnet',
  solanaRpcUrl: process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  gameEscrowProgramId: process.env.EXPO_PUBLIC_GAME_ESCROW_PROGRAM_ID || '4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd',

  // Features
  smartContractsEnabled: true,

  // Game
  minWagerAmount: 0.01,
  maxWagerAmount: 1,
  gameTimeoutMs: 600000, // 10 minutes

  // App
  appName: 'Korus',
  appUrl: 'https://korus.app',

  // Services
  heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Debug - enable for testing in production
  enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === 'true' || true,
  logLevel: (process.env.EXPO_PUBLIC_LOG_LEVEL as any) || 'info',
};

// Export helpers
export const isProduction = true;
export const isDevelopment = false;

// Log config on app start
if (config.enableLogging) {
  console.log('🌍 Environment: PRODUCTION');
  console.log('📡 API URL:', config.apiUrl);
  console.log('⛓️ Solana Cluster:', config.solanaCluster);
  console.log('📱 App Name:', config.appName);
  console.log('🎮 Game Escrow Program:', config.gameEscrowProgramId);
}
