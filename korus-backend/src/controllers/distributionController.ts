import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { getWeekDates } from '../utils/dateHelpers'
import { distributionService } from '../services/distributionService'

export const getMyDistributions = async (req: AuthRequest, res: Response) => {
  try {
    const userWallet = req.userWallet!
    const { limit = 10, offset = 0 } = req.query

    const distributions = await prisma.tokenDistribution.findMany({
      where: { userWallet },
      orderBy: { distributionDate: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })

    // Calculate total earned and claimed
    const stats = await prisma.tokenDistribution.aggregate({
      where: { userWallet },
      _sum: { tokensEarned: true },
      _count: { claimed: true }
    })

    const claimedStats = await prisma.tokenDistribution.aggregate({
      where: { userWallet, claimed: true },
      _sum: { tokensEarned: true }
    })

    res.json({
      success: true,
      distributions,
      stats: {
        totalEarned: stats._sum.tokensEarned || 0,
        totalClaimed: claimedStats._sum.tokensEarned || 0,
        totalDistributions: stats._count.claimed || 0
      }
    })
  } catch (error) {
    logger.error('Get my distributions error:', error)
    res.status(500).json({ error: 'Failed to get distributions' })
  }
}

export const getWeeklyLeaderboard = async (req: Request, res: Response) => {
  try {
    const { week } = req.query
    let weekStartDate: Date

    if (week) {
      weekStartDate = new Date(week as string)
    } else {
      // Get current week
      const { weekStart } = getWeekDates(new Date())
      weekStartDate = weekStart
    }

    // Get top earners for the week
    const distributions = await prisma.tokenDistribution.findMany({
      where: { weekStartDate },
      orderBy: { tokensEarned: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      }
    })

    // Get pool info
    const pool = await prisma.weeklyRepPool.findUnique({
      where: { weekStartDate }
    })

    res.json({
      success: true,
      week: weekStartDate,
      leaderboard: distributions.map((dist, index) => ({
        rank: index + 1,
        wallet: dist.userWallet,
        displayName: `${dist.userWallet.slice(0, 4)}...${dist.userWallet.slice(-4)}`,
        isPremium: dist.user.tier === 'premium',
        isGenesis: dist.user.genesisVerified,
        repEarned: dist.repEarned,
        tokensEarned: dist.tokensEarned,
        sharePercentage: dist.sharePercentage,
        claimed: dist.claimed
      })),
      poolInfo: {
        totalPool: pool?.totalPoolSize || 0,
        totalParticipants: pool?.participantCount || 0,
        distributed: pool?.distributed || false,
        revenues: {
          sponsoredPosts: pool?.sponsoredPostRevenue || 0,
          gameFees: pool?.gameFeesCollected || 0,
          eventFees: pool?.eventFeesCollected || 0
        }
      }
    })
  } catch (error) {
    logger.error('Get weekly leaderboard error:', error)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}

export const getCurrentPoolStatus = async (req: Request, res: Response) => {
  try {
    const { weekStart, weekEnd, friday } = getWeekDates(new Date())

    // Get or create current week's pool
    const pool = await prisma.weeklyRepPool.findUnique({
      where: { weekStartDate: weekStart }
    })

    // Get active users this week
    const activeUsers = await prisma.user.count({
      where: {
        weeklyRepEarned: { gt: 0 },
        weekStartDate: weekStart
      }
    })

    // Calculate estimated pool size
    const currentRevenue = pool ? 
      pool.sponsoredPostRevenue.toNumber() + 
      pool.gameFeesCollected.toNumber() + 
      pool.eventFeesCollected.toNumber() : 0
    
    const estimatedPoolSize = currentRevenue * 0.7 // 70% goes to users

    res.json({
      success: true,
      currentWeek: {
        start: weekStart,
        end: weekEnd,
        distributionDate: friday,
        daysUntilDistribution: Math.ceil((friday.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      },
      pool: {
        revenues: {
          sponsoredPosts: pool?.sponsoredPostRevenue || 0,
          gameFees: pool?.gameFeesCollected || 0,
          eventFees: pool?.eventFeesCollected || 0,
          total: currentRevenue
        },
        estimatedPoolSize,
        activeParticipants: activeUsers,
        distributed: pool?.distributed || false
      }
    })
  } catch (error) {
    logger.error('Get pool status error:', error)
    res.status(500).json({ error: 'Failed to get pool status' })
  }
}

export const claimTokens = async (req: AuthRequest, res: Response) => {
  try {
    const userWallet = req.userWallet!
    const { weekStartDate } = req.body

    if (!weekStartDate) {
      return res.status(400).json({ error: 'Week start date required' })
    }

    const distribution = await distributionService.claimTokens(
      userWallet, 
      new Date(weekStartDate)
    )

    res.json({
      success: true,
      distribution
    })
  } catch (error: any) {
    logger.error('Claim tokens error:', error)
    res.status(400).json({ error: error.message || 'Failed to claim tokens' })
  }
}