import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// In-memory storage (no database needed)
interface SimpleUser {
  walletAddress: string;
  tier: string;
  allyBalance: string;
  createdAt: Date;
}

interface SimplePost {
  id: string;
  content: string;
  topic: string;
  authorWallet: string;
  createdAt: Date;
  likeCount: number;
  replyCount: number;
}

const users = new Map<string, SimpleUser>();
const posts: SimplePost[] = [];

// Simple auth endpoint that doesn't need database
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    console.log('Auth request received:', { walletAddress });
    
    // Create or get user from memory
    if (!users.has(walletAddress)) {
      users.set(walletAddress, {
        walletAddress,
        tier: 'standard',
        allyBalance: '5000',
        createdAt: new Date()
      });
    }
    
    // Generate token
    const token = jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: '7d' });
    
    // Return success
    res.json({
      token,
      user: users.get(walletAddress)
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get posts endpoint
app.get('/api/posts', (req, res) => {
  res.json({
    posts: posts.slice(0, 20),
    totalCount: posts.length
  });
});

// Create post endpoint
app.post('/api/posts', (req, res) => {
  const { content, topic } = req.body;
  const newPost = {
    id: String(posts.length + 1),
    content,
    topic,
    authorWallet: req.body.walletAddress || 'anonymous',
    createdAt: new Date(),
    likeCount: 0,
    replyCount: 0
  };
  posts.push(newPost);
  res.json(newPost);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Running without database',
    userCount: users.size,
    postCount: posts.length
  });
});

app.get('/test-db', (req, res) => {
  res.json({ 
    message: 'No database - using in-memory storage',
    userCount: users.size,
    postCount: posts.length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Simple server (NO DATABASE) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Data is stored in memory only!`);
});