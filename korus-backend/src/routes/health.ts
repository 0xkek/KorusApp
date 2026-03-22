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

// One-time cleanup endpoint — cancel stale test games
router.get('/health/cleanup', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const cancelled = await prisma.game.updateMany({
      where: { status: 'waiting' },
      data: { status: 'cancelled' }
    });

    res.json({
      success: true,
      cancelledGames: cancelled.count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;