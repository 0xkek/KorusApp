/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are set before starting the server
 */

export interface EnvConfig {
  NODE_ENV: string
  PORT: number
  DATABASE_URL: string | undefined
  JWT_SECRET: string
  FRONTEND_URL: string
  CORS_ORIGINS: string | undefined
  SOLANA_RPC_URL: string | undefined
  GENESIS_TOKEN_MINT: string | undefined
  ENABLE_REPUTATION: boolean
  ENABLE_WEEKLY_DISTRIBUTION: boolean
  DEBUG_MODE: boolean
  HELIUS_API_KEY: string | undefined
  ALLOW_AUTH_BYPASS: boolean
}

export function validateEnv(): EnvConfig {
  const errors: string[] = []
  
  // Check required variables for production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production')
    }
    
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET is required in production')
    } else if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production')
    }
    
    if (!process.env.FRONTEND_URL) {
      errors.push('FRONTEND_URL is required in production')
    }
    
    if (process.env.ALLOW_AUTH_BYPASS === 'true') {
      errors.push('ALLOW_AUTH_BYPASS must be disabled in production')
    }
  }
  
  // Throw if there are errors
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Invalid environment configuration')
  }
  
  // Build config object with defaults
  const config: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key-CHANGE-THIS' : ''),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8081',
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    GENESIS_TOKEN_MINT: process.env.GENESIS_TOKEN_MINT,
    ENABLE_REPUTATION: process.env.ENABLE_REPUTATION !== 'false',
    ENABLE_WEEKLY_DISTRIBUTION: process.env.ENABLE_WEEKLY_DISTRIBUTION === 'true',
    DEBUG_MODE: process.env.DEBUG_MODE === 'true',
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    ALLOW_AUTH_BYPASS: process.env.ALLOW_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production'
  }
  
  // Log configuration (without sensitive data)
  console.log('✅ Environment validated successfully')
  console.log('Configuration:')
  console.log(`  - NODE_ENV: ${config.NODE_ENV}`)
  console.log(`  - PORT: ${config.PORT}`)
  console.log(`  - DATABASE_URL: ${config.DATABASE_URL ? '✓ Set' : '✗ Missing'}`)
  console.log(`  - JWT_SECRET: ${config.JWT_SECRET ? '✓ Set (length: ' + config.JWT_SECRET.length + ')' : '✗ Missing'}`)
  console.log(`  - CORS_ORIGINS: ${config.CORS_ORIGINS || 'Not set (will use defaults)'}`)
  console.log(`  - Features:`)
  console.log(`    - Reputation: ${config.ENABLE_REPUTATION ? 'Enabled' : 'Disabled'}`)
  console.log(`    - Weekly Distribution: ${config.ENABLE_WEEKLY_DISTRIBUTION ? 'Enabled' : 'Disabled'}`)
  console.log(`    - Debug Mode: ${config.DEBUG_MODE ? 'Enabled' : 'Disabled'}`)
  console.log(`    - Auth Bypass: ${config.ALLOW_AUTH_BYPASS ? '⚠️ ENABLED (dev only)' : 'Disabled'}`)
  
  return config
}