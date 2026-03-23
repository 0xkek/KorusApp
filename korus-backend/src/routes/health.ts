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


// Temporary cleanup — remove after use
router.get('/health/cleanup-posts', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    // Delete all posts created before 2026 (test data)
    const cutoff = new Date('2026-01-01T00:00:00Z');

    // Delete related records first (interactions, replies, etc.)
    await prisma.interaction.deleteMany({ where: { createdAt: { lt: cutoff } } });
    await prisma.reply.deleteMany({ where: { createdAt: { lt: cutoff } } });

    // Delete game-linked posts' games first
    const gamePosts = await prisma.game.findMany({ where: { post: { createdAt: { lt: cutoff } } }, select: { id: true } });
    if (gamePosts.length > 0) {
      await prisma.gameEscrow.deleteMany({ where: { gameId: { in: gamePosts.map(g => g.id) } } });
      await prisma.game.deleteMany({ where: { id: { in: gamePosts.map(g => g.id) } } });
    }

    const deleted = await prisma.post.deleteMany({ where: { createdAt: { lt: cutoff } } });

    res.json({ success: true, deletedPosts: deleted.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;