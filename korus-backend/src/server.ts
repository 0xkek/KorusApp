import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import prisma from './config/database'
import { apiLimiter } from './middleware/rateLimiter'

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

// Test routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Korus Backend is running!',
    timestamp: new Date().toISOString() 
  })
})

app.get('/test-db', async (req, res) => {
  try {
    const userCount = await prisma.user.count()
    const postCount = await prisma.post.count()
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { walletAddress: true, createdAt: true }
    })
    res.json({ 
      message: 'Database connected successfully!', 
      userCount,
      postCount,
      recentUsers,
      tables: 'users, posts, replies, interactions, games'
    })
  } catch (error) {
    console.error('Database error:', error)
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error 
    })
  }
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
  console.log(`\n🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`)
  
  if (isMockMode) {
    console.log(`\n⚠️  Running in MOCK MODE - No database connection required`)
    console.log(`📝 Data is stored in memory and will be lost on restart`)
  }
})