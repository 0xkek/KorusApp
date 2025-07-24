import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import prisma from './config/database'

// Import routes
import authRoutes from './routes/auth'
import interactionsRoutes from './routes/interactions'
import postsRoutes from './routes/posts'
import repliesRoutes from './routes/replies'

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

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/posts', repliesRoutes)  // For /api/posts/:id/replies endpoints
app.use('/api/interactions', interactionsRoutes)
app.use('/api/replies', repliesRoutes)  // For /api/replies/:id/like endpoints

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
    res.json({ 
      message: 'Database connected successfully!', 
      userCount,
      tables: 'users, posts, replies, interactions'
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
  console.log(`\n🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`)
  
  if (isMockMode) {
    console.log(`\n⚠️  Running in MOCK MODE - No database connection required`)
    console.log(`📝 Data is stored in memory and will be lost on restart`)
  }
})