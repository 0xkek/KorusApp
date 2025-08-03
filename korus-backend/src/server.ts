import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import prisma from './config/database'
import { apiLimiter } from './middleware/rateLimiter'
// import { scheduleWeeklyDistribution } from './jobs/weeklyDistribution'

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
// import distributionRoutes from './routes/distribution'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
app.use(morgan('combined'))
app.use(express.json())

// Debug logging for all requests
app.use((req, res, next) => {
  console.log('=== INCOMING REQUEST ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Body:', req.body)
  console.log('Headers:', req.headers)
  console.log('=======================')
  next()
})

// Apply rate limiting to all API routes
app.use('/api', apiLimiter)

// Routes
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
// app.use('/api/distribution', distributionRoutes)

// Test routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Korus Backend is running!',
    timestamp: new Date().toISOString() 
  })
})

// Temporary migration check endpoint
app.get('/check-migrations', async (req, res) => {
  try {
    // Check migration history
    const migrations = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10`
    
    res.json({
      migrations,
      totalMigrations: Array.isArray(migrations) ? migrations.length : 0
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check migrations',
      details: error 
    })
  }
})

// Debug notification endpoint
app.get('/debug-notifications', async (req, res) => {
  try {
    const hasTable = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `
    
    let sampleNotification = null
    if (hasTable[0]?.exists) {
      try {
        sampleNotification = await prisma.notification.findFirst()
      } catch (e) {
        // Table exists but query failed
      }
    }
    
    res.json({
      hasNotificationsTable: hasTable[0]?.exists || false,
      sampleNotification,
      apiVersion: '1.0.3',
      deployTime: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Debug check failed',
      details: error.message 
    })
  }
})

app.get('/test-db', async (req, res) => {
  try {
    const userCount = await prisma.user.count()
    const postCount = await prisma.post.count()
    
    // Check if notifications table exists
    let notificationCount = 0
    let hasNotificationsTable = false
    try {
      notificationCount = await prisma.notification.count()
      hasNotificationsTable = true
    } catch (e) {
      console.log('Notifications table not found:', e)
    }
    
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { walletAddress: true, createdAt: true }
    })
    res.json({ 
      message: 'Database connected successfully!', 
      userCount,
      postCount,
      notificationCount,
      hasNotificationsTable,
      recentUsers,
      tables: 'users, posts, replies, interactions, games' + (hasNotificationsTable ? ', notifications' : ''),
      version: '1.0.3' // With debug endpoints
    })
  } catch (error) {
    console.error('Database error:', error)
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error 
    })
  }
})

// Global error handler (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('=== UNHANDLED ERROR ===')
  console.error('URL:', req.url)
  console.error('Method:', req.method)
  console.error('Body:', req.body)
  console.error('Error:', err)
  console.error('Stack:', err?.stack)
  console.error('====================')
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err : undefined
  })
})

// Start server
app.listen(PORT, () => {
  const isMockMode = !process.env.DATABASE_URL || process.env.MOCK_MODE === 'true';
  
  console.log(`🚀 Korus Backend running on http://localhost:${PORT}`)
  console.log(`📊 Health: http://localhost:${PORT}/health`)
  console.log(`🗄️ Database: http://localhost:${PORT}/test-db`)
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/*`)
  console.log(`📝 Posts: http://localhost:${PORT}/api/posts/*`)
  console.log(`💫 Interactions: http://localhost:${PORT}/api/interactions/*`)
  console.log(`💬 Replies: http://localhost:${PORT}/api/posts/*/replies`)
  console.log(`🎮 Games: http://localhost:${PORT}/api/games/*`)
  console.log(`🔍 Search: http://localhost:${PORT}/api/search`)
  console.log(`🚨 Reports: http://localhost:${PORT}/api/reports`)
  console.log(`🛡️ Moderation: http://localhost:${PORT}/api/moderation`)
  console.log(`🏆 Reputation: http://localhost:${PORT}/api/reputation/*`)
  console.log(`💰 Sponsored: http://localhost:${PORT}/api/sponsored/*`)
  console.log(`🎁 Distribution: http://localhost:${PORT}/api/distribution/*`)
  console.log(`\n🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`)
  
  // Environment check
  console.log(`\n🔐 Environment Check:`)
  console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`)
  console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️  Using default (not secure for production)'}`)
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  
  if (isMockMode) {
    console.log(`\n⚠️  Running in MOCK MODE - No database connection required`)
    console.log(`📝 Data is stored in memory and will be lost on restart`)
  } else {
    // Schedule weekly distribution cron job
    // scheduleWeeklyDistribution()
    // console.log(`\n⏰ Weekly distribution scheduled for Fridays at 8:00 PM UTC`)
  }
})