import { logger } from '../utils/logger'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Test database connection
prisma.$connect()
  .then(() => {
    logger.info('✅ Database connected successfully')
  })
  .catch((error) => {
    logger.error('❌ Database connection failed:', error)
    logger.error('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
  })

export default prisma