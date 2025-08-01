import { Router } from 'express';
import prisma from '../config/database';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Korus Backend is running!',
    timestamp: new Date().toISOString()
  });
});

router.get('/health/db', async (req, res) => {
  try {
    // Try to count users in database
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    
    res.json({
      status: 'OK',
      database: 'Connected',
      mode: 'Real Database',
      stats: {
        users: userCount,
        posts: postCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.json({
      status: 'OK', 
      database: 'Not Connected',
      mode: 'Mock Mode',
      error: error.message,
      note: 'Backend is running in mock mode - data will not persist',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;