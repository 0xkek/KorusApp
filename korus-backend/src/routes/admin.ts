import { Router } from 'express';
import { authenticate as authenticateJWT, AuthRequest } from '../middleware/auth';
import { isAuthorityConfigured } from '../config/gameAuthority';
import { gameCompletionService } from '../services/gameCompletionService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Authority wallet that can perform admin actions
const ADMIN_WALLETS = [
  'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG',
  '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L'
];

/**
 * Admin health check endpoint
 * Shows status of critical services
 */
router.get('/health', async (req, res) => {
  try {
    const authorityConfigured = isAuthorityConfigured();
    const authorityBalance = await gameCompletionService.checkAuthorityBalance();
    
    const status = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: true, // Assume OK if we got here
        authority: {
          configured: authorityConfigured,
          balance: authorityBalance,
          sufficient: authorityBalance >= 0.01, // Need at least 0.01 SOL for fees
        },
        network: process.env.SOLANA_RPC_URL?.includes('mainnet') ? 'mainnet' : 'devnet',
        programId: process.env.GAME_ESCROW_PROGRAM_ID || 'not-set',
      }
    };

    const allHealthy = authorityConfigured && authorityBalance >= 0.01;
    
    res.status(allHealthy ? 200 : 503).json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'ERROR',
      error: 'Health check failed'
    });
  }
});

/**
 * Manual game completion endpoint (admin only)
 * For testing or dispute resolution
 */
router.post('/complete-game', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin (you'd implement this check)
    // For now, we'll skip admin check for testing
    
    const { gameId, winner, loser, wagerAmount } = req.body;
    
    if (!gameId || !winner || !loser || !wagerAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await gameCompletionService.completeGame(
      gameId,
      winner,
      loser,
      wagerAmount
    );

    res.json(result);
  } catch (error) {
    logger.error('Manual game completion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete game'
    });
  }
});

/**
 * Set user tier (admin only)
 * POST /api/admin/set-tier
 */
router.post('/set-tier', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const callerWallet = req.userWallet;
    if (!callerWallet || !ADMIN_WALLETS.includes(callerWallet)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { walletAddress, tier } = req.body;
    if (!walletAddress || !tier) {
      return res.status(400).json({ success: false, error: 'walletAddress and tier required' });
    }

    const validTiers = ['standard', 'premium', 'vip'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ success: false, error: `Invalid tier. Must be: ${validTiers.join(', ')}` });
    }

    const user = await prisma.user.update({
      where: { walletAddress },
      data: { tier },
      select: { walletAddress: true, username: true, tier: true }
    });

    logger.log(`Admin ${callerWallet} set tier for ${walletAddress} to ${tier}`);
    res.json({ success: true, user });
  } catch (error) {
    logger.error('Failed to set tier:', error);
    res.status(500).json({ success: false, error: 'Failed to set tier' });
  }
});

/**
 * Grant premium to a user with duration
 * POST /api/admin/grant-premium
 */
router.post('/grant-premium', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const callerWallet = req.userWallet;
    if (!callerWallet || !ADMIN_WALLETS.includes(callerWallet)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { walletAddress, days } = req.body;
    if (!walletAddress || !days) {
      return res.status(400).json({ success: false, error: 'walletAddress and days required' });
    }

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 3650) {
      return res.status(400).json({ success: false, error: 'days must be between 1 and 3650' });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + numDays * 24 * 60 * 60 * 1000);

    const user = await prisma.user.update({
      where: { walletAddress },
      data: {
        tier: 'premium',
        subscriptionType: 'admin_grant',
        subscriptionStatus: 'active',
        subscriptionStartDate: now,
        subscriptionEndDate: endDate,
      },
      select: { walletAddress: true, username: true, tier: true, subscriptionEndDate: true },
    });

    logger.log(`Admin ${callerWallet} granted premium to ${walletAddress} for ${numDays} days (until ${endDate.toISOString()})`);
    res.json({ success: true, user, expiresAt: endDate.toISOString() });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    logger.error('Failed to grant premium:', error);
    res.status(500).json({ success: false, error: 'Failed to grant premium' });
  }
});

/**
 * Revoke premium from a user
 * POST /api/admin/revoke-premium
 */
router.post('/revoke-premium', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const callerWallet = req.userWallet;
    if (!callerWallet || !ADMIN_WALLETS.includes(callerWallet)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress required' });
    }

    const user = await prisma.user.update({
      where: { walletAddress },
      data: {
        tier: 'standard',
        subscriptionStatus: 'inactive',
        subscriptionEndDate: null,
      },
      select: { walletAddress: true, username: true, tier: true },
    });

    logger.log(`Admin ${callerWallet} revoked premium from ${walletAddress}`);
    res.json({ success: true, user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    logger.error('Failed to revoke premium:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke premium' });
  }
});

// --- Admin auth helper ---
const requireAdminWallet = (req: AuthRequest, res: any): boolean => {
  const callerWallet = req.userWallet;
  if (!callerWallet || !ADMIN_WALLETS.includes(callerWallet)) {
    res.status(403).json({ success: false, error: 'Not authorized' });
    return false;
  }
  return true;
};

/**
 * Platform overview stats
 * GET /api/admin/stats
 */
router.get('/stats', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    if (!requireAdminWallet(req, res)) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      totalPosts,
      postsToday,
      postsThisWeek,
      totalReplies,
      totalTips,
      totalGames,
      tierDistribution,
      dailySignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.post.count({ where: { isHidden: false } }),
      prisma.post.count({ where: { isHidden: false, createdAt: { gte: today } } }),
      prisma.post.count({ where: { isHidden: false, createdAt: { gte: sevenDaysAgo } } }),
      prisma.reply.count({ where: { isHidden: false } }),
      prisma.interaction.aggregate({
        where: { interactionType: 'tip' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.game.count(),
      prisma.user.groupBy({
        by: ['tier'],
        _count: true,
      }),
      // Daily signups for the last 30 days
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          today: usersToday,
          thisWeek: usersThisWeek,
          thisMonth: usersThisMonth,
        },
        content: {
          totalPosts,
          postsToday,
          postsThisWeek,
          totalReplies,
        },
        tips: {
          totalVolume: Number(totalTips._sum.amount || 0),
          totalCount: totalTips._count,
        },
        games: {
          total: totalGames,
        },
        tiers: tierDistribution.reduce((acc: any, t: any) => {
          acc[t.tier] = t._count;
          return acc;
        }, {}),
        dailySignups: dailySignups.map((d: any) => ({
          date: d.date,
          count: Number(d.count),
        })),
      },
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to load stats' });
  }
});

/**
 * Reputation leaderboard
 * GET /api/admin/reputation-leaderboard?limit=100&offset=0
 */
router.get('/reputation-leaderboard', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    if (!requireAdminWallet(req, res)) return;

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          walletAddress: true,
          username: true,
          displayName: true,
          snsUsername: true,
          tier: true,
          reputationScore: true,
          contentScore: true,
          engagementScore: true,
          communityScore: true,
          loyaltyScore: true,
          shoutoutScore: true,
          createdAt: true,
          lastLoginDate: true,
        },
        orderBy: { reputationScore: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      users,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Admin reputation leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' });
  }
});

/**
 * Users list with search
 * GET /api/admin/users?search=&limit=50&offset=0
 */
router.get('/users', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    if (!requireAdminWallet(req, res)) return;

    const search = (req.query.search as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortDir = (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc';

    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { displayName: { contains: search, mode: 'insensitive' as const } },
        { walletAddress: { contains: search } },
        { snsUsername: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const validSortFields: Record<string, string> = {
      createdAt: 'createdAt',
      reputationScore: 'reputationScore',
      username: 'username',
    };
    const orderField = validSortFields[sortBy] || 'createdAt';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          walletAddress: true,
          username: true,
          displayName: true,
          snsUsername: true,
          tier: true,
          reputationScore: true,
          isSuspended: true,
          createdAt: true,
          lastLoginDate: true,
          _count: {
            select: {
              posts: true,
              replies: true,
            },
          },
        },
        orderBy: { [orderField]: sortDir },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Admin users list error:', error);
    res.status(500).json({ success: false, error: 'Failed to load users' });
  }
});

/**
 * Tips leaderboard (top tippers and receivers)
 * GET /api/admin/tips-leaderboard?limit=50
 */
router.get('/tips-leaderboard', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    if (!requireAdminWallet(req, res)) return;

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    // Top tippers (by amount sent)
    const topTippers = await prisma.interaction.groupBy({
      by: ['userWallet'],
      where: { interactionType: 'tip' },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    // Get usernames for tippers
    const tipperWallets = topTippers.map(t => t.userWallet);
    const tipperUsers = await prisma.user.findMany({
      where: { walletAddress: { in: tipperWallets } },
      select: { walletAddress: true, username: true, snsUsername: true },
    });
    const tipperMap = Object.fromEntries(tipperUsers.map(u => [u.walletAddress, u]));

    // Top receivers (posts with most tips)
    const topReceivers = await prisma.$queryRaw<Array<{ authorWallet: string; total_tips: number; tip_count: number }>>`
      SELECT "authorWallet", SUM("tipAmount")::float as total_tips, SUM("tipCount")::int as tip_count
      FROM "Post"
      WHERE "tipCount" > 0
      GROUP BY "authorWallet"
      ORDER BY total_tips DESC
      LIMIT ${limit}
    `;

    const receiverWallets = topReceivers.map(r => r.authorWallet);
    const receiverUsers = await prisma.user.findMany({
      where: { walletAddress: { in: receiverWallets } },
      select: { walletAddress: true, username: true, snsUsername: true },
    });
    const receiverMap = Object.fromEntries(receiverUsers.map(u => [u.walletAddress, u]));

    res.json({
      success: true,
      topTippers: topTippers.map(t => ({
        wallet: t.userWallet,
        username: tipperMap[t.userWallet]?.username || tipperMap[t.userWallet]?.snsUsername || null,
        totalSent: Number(t._sum.amount || 0),
        tipCount: t._count,
      })),
      topReceivers: topReceivers.map(r => ({
        wallet: r.authorWallet,
        username: receiverMap[r.authorWallet]?.username || receiverMap[r.authorWallet]?.snsUsername || null,
        totalReceived: Number(r.total_tips || 0),
        tipCount: Number(r.tip_count || 0),
      })),
    });
  } catch (error) {
    logger.error('Admin tips leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load tips leaderboard' });
  }
});

export default router;