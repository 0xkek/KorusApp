import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import prisma from './config/database'
import { apiLimiter } from './middleware/rateLimiter'
import { scheduleWeeklyDistribution } from './jobs/weeklyDistribution'
import { validateEnv } from './config/validateEnv'
import { sanitizeBody } from './middleware/sanitization'
import { securityHeaders, requestIdMiddleware, validateCSRFToken } from './middleware/security'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { requestLogger, performanceLogger } from './middleware/requestLogger'
import { logger } from './utils/logger'
import { swaggerSpec } from './config/swagger'

// Import routes
import authRoutes from './routes/auth'
import interactionsRoutes from './routes/interactions'
import postsRoutes from './routes/posts'
import repliesRoutes from './routes/replies'
import gamesRoutes from './routes/games'
import searchRoutes from './routes/search'
import reportsRoutes from './routes/reports'
import moderationRoutes from './routes/moderation'
import reputationRoutes from './routes/reputation'
import sponsoredRoutes from './routes/sponsored'
import notificationsRoutes from './routes/notifications'
import distributionRoutes from './routes/distribution'
import snsRoutes from './routes/sns'
import nftsRoutes from './routes/nfts'
import healthRoutes from './routes/health'
import userRoutes from './routes/user'

dotenv.config()

// Validate environment variables
const envConfig = validateEnv()

const app = express()
const PORT = envConfig.PORT

// CORS configuration
const getAllowedOrigins = () => {
  const originsEnv = process.env.CORS_ORIGINS || ''
  const origins = originsEnv.split(',').map(o => o.trim()).filter(Boolean)
  
  // Default origins for development
  if (origins.length === 0 && process.env.NODE_ENV === 'development') {
    return ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006']
  }
  
  return origins
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins()
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true)
    }
    
    // Strictly check the whitelist in production
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Security middleware
app.use(securityHeaders) // Enhanced security headers
app.use(requestIdMiddleware) // Add request tracking
app.use(cors(corsOptions))

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  // In production, use structured JSON logging
  app.use(morgan('combined'))
} else {
  // In development, use colored console logging
  app.use(morgan('dev'))
}

app.use(express.json())
app.use(sanitizeBody) // Sanitize all inputs

// Request/Response logging
app.use(requestLogger)
app.use(performanceLogger(1000)) // Log requests taking > 1 second

// Swagger API documentation (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Korus API Documentation'
  }))
}

// Apply rate limiting to all API routes
app.use('/api', apiLimiter)

// Routes
app.use('/', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/posts', repliesRoutes)  // For /api/posts/:id/replies endpoints
app.use('/api/interactions', interactionsRoutes)
app.use('/api/replies', repliesRoutes)  // For /api/replies/:id/like endpoints
app.use('/api/games', gamesRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/reputation', reputationRoutes)
app.use('/api/sponsored', sponsoredRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/distribution', distributionRoutes)
app.use('/api/sns', snsRoutes)
app.use('/api/nfts', nftsRoutes)
app.use('/api/user', userRoutes)

// Debug endpoints removed for production security

// Global error handler (must be last)
// 404 handler - must come after all routes
app.use(notFoundHandler)

// Global error handler - must be last middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  // Production mode only - mock mode removed
  
  logger.info(`🚀 Korus Backend running on http://localhost:${PORT}`)
  logger.info(`📊 Health: http://localhost:${PORT}/health`)
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`)
  }
  logger.info(`🔐 Auth: http://localhost:${PORT}/api/auth/*`)
  logger.info(`📝 Posts: http://localhost:${PORT}/api/posts/*`)
  logger.info(`💫 Interactions: http://localhost:${PORT}/api/interactions/*`)
  logger.info(`💬 Replies: http://localhost:${PORT}/api/posts/*/replies`)
  logger.info(`🎮 Games: http://localhost:${PORT}/api/games/*`)
  logger.info(`🔍 Search: http://localhost:${PORT}/api/search`)
  logger.info(`🚨 Reports: http://localhost:${PORT}/api/reports`)
  logger.info(`🛡️ Moderation: http://localhost:${PORT}/api/moderation`)
  logger.info(`🏆 Reputation: http://localhost:${PORT}/api/reputation/*`)
  logger.info(`💰 Sponsored: http://localhost:${PORT}/api/sponsored/*`)
  logger.info(`🎁 Distribution: http://localhost:${PORT}/api/distribution/*`)
  logger.info(`\n🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`)
  
  // Environment check
  logger.info(`\n🔐 Environment Check:`)
  logger.info(`- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`)
  logger.info(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️  Using default (not secure for production)'}`)
  logger.info(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  
  // Schedule weekly distribution cron job if enabled
  if (process.env.ENABLE_WEEKLY_DISTRIBUTION === 'true') {
    scheduleWeeklyDistribution()
    logger.info(`\n⏰ Weekly distribution scheduled for Fridays at 8:00 PM UTC`)
  } else {
    logger.info(`\n⏸️  Weekly distribution is disabled (set ENABLE_WEEKLY_DISTRIBUTION=true to enable)`)
  }
})