import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { reputationService } from '../services/reputationService'

export const getUserReputation = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        walletAddress: true,
        reputationScore: true,
        contentScore: true,
        engagementScore: true,
        communityScore: true,
        loyaltyScore: true,
        tier: true,
        genesisVerified: true,
        loginStreak: true,
        createdAt: true,
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get recent reputation events
    const recentEvents = await prisma.repEvent.findMany({
      where: { userWallet: walletAddress },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Calculate tier based on score
    const tier = getReputationTier(user.reputationScore)

    res.json({
      success: true,
      reputation: {
        ...user,
        tier,
        recentEvents,
      }
    })
  } catch (error) {
    console.error('Get user reputation error:', error)
    res.status(500).json({ error: 'Failed to get reputation' })
  }
}

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { limit = 100, timeframe = 'all' } = req.query

    if (timeframe === 'daily') {
      const leaderboard = await reputationService.getDailyLeaderboard()
      return res.json({
        success: true,
        timeframe: 'daily',
        leaderboard: leaderboard.slice(0, Number(limit)),
      })
    }

    const leaderboard = await reputationService.getLeaderboard(Number(limit))
    
    res.json({
      success: true,
      timeframe: 'all',
      leaderboard,
    })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}

export const recordDailyLogin = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!

    await reputationService.onDailyLogin(walletAddress)

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        loginStreak: true,
        reputationScore: true,
      }
    })

    res.json({
      success: true,
      loginStreak: user?.loginStreak || 0,
      reputationScore: user?.reputationScore || 0,
    })
  } catch (error) {
    console.error('Record daily login error:', error)
    res.status(500).json({ error: 'Failed to record login' })
  }
}

// Helper function to determine reputation tier
function getReputationTier(score: number): { name: string; min: number; max: number } {
  const tiers = [
    { name: 'Seedling', min: 0, max: 100 },
    { name: 'Sprout', min: 101, max: 500 },
    { name: 'Tree', min: 501, max: 2000 },
    { name: 'Forest', min: 2001, max: 10000 },
    { name: 'Mountain', min: 10001, max: 50000 },
    { name: 'Celestial', min: 50001, max: Number.MAX_SAFE_INTEGER },
  ]

  return tiers.find(tier => score >= tier.min && score <= tier.max) || tiers[0]
}