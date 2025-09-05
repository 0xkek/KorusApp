import { logger } from '../utils/logger'

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
  ENABLE_TOKEN_FEATURES: boolean
  DEBUG_MODE: boolean
  HELIUS_API_KEY: string | undefined
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
  }
  
  // Throw if there are errors
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:')
    errors.forEach(error => logger.error(`  - ${error}`))
    throw new Error('Invalid environment configuration')
  }
  
  // Build config object with defaults
  const config: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || '',
    FRONTEND_URL: process.env.FRONTEND_URL || '',
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    GENESIS_TOKEN_MINT: process.env.GENESIS_TOKEN_MINT,
    ENABLE_REPUTATION: process.env.ENABLE_REPUTATION !== 'false',
    ENABLE_WEEKLY_DISTRIBUTION: process.env.ENABLE_WEEKLY_DISTRIBUTION === 'true',
    ENABLE_TOKEN_FEATURES: process.env.ENABLE_TOKEN_FEATURES !== 'false',
    DEBUG_MODE: process.env.DEBUG_MODE === 'true',
    HELIUS_API_KEY: process.env.HELIUS_API_KEY
  }
  
  // Log configuration (without sensitive data)
  logger.info('✅ Environment validated successfully')
  logger.info('Configuration:')
  logger.info(`  - NODE_ENV: ${config.NODE_ENV}`)
  logger.info(`  - PORT: ${config.PORT}`)
  logger.info(`  - DATABASE_URL: ${config.DATABASE_URL ? '✓ Set' : '✗ Missing'}`)
  logger.info(`  - JWT_SECRET: ${config.JWT_SECRET ? '✓ Set (length: ' + config.JWT_SECRET.length + ')' : '✗ Missing'}`)
  logger.info(`  - CORS_ORIGINS: ${config.CORS_ORIGINS || 'Not set (will use defaults)'}`)
  logger.info(`  - Features:`)
  logger.info(`    - Reputation: ${config.ENABLE_REPUTATION ? 'Enabled' : 'Disabled'}`)
  logger.info(`    - Weekly Distribution: ${config.ENABLE_WEEKLY_DISTRIBUTION ? 'Enabled' : 'Disabled'}`)
  logger.info(`    - Debug Mode: ${config.DEBUG_MODE ? 'Enabled' : 'Disabled'}`)
  
  return config
}