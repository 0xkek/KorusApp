import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { getWeekNumber, getWeekDates } from '../utils/dateHelpers'
import { asyncHandler } from '../middleware/errorHandler'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'

export const createSponsoredPost = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { postId, campaignName, durationDays, targetViews, pricePaid } = req.body
    const sponsorWallet = req.userWallet!

    // Validate the post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND')
    }

    // Check if post is already sponsored
    const existingSponsorship = await prisma.sponsoredPost.findUnique({
      where: { postId }
    })

    if (existingSponsorship) {
      throw new AppError('Post is already sponsored', 400, 'ALREADY_SPONSORED')
    }

    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + durationDays)

    // Create sponsored post
    const sponsoredPost = await prisma.sponsoredPost.create({
      data: {
        postId,
        sponsorWallet,
        campaignName,
        pricePaid,
        startDate: now,
        endDate,
        targetViews,
        weekNumber: getWeekNumber(now),
        yearNumber: now.getFullYear()
      }
    })

    // Add to current week's revenue pool
    const { weekStart } = getWeekDates(now)
    
    await prisma.weeklyRepPool.upsert({
      where: { weekStartDate: weekStart },
      create: {
        weekStartDate: weekStart,
        weekEndDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), // Sunday
        distributionDate: new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000), // Friday
        sponsoredPostRevenue: pricePaid
      },
      update: {
        sponsoredPostRevenue: {
          increment: pricePaid
        }
      }
    })

    res.status(201).json({
      success: true,
      sponsoredPost
    })
})

export const getSponsoredPosts = asyncHandler(async (req: Request, res: Response) => {
    const now = new Date()

    // Get active sponsored posts
    const sponsoredPosts = await prisma.sponsoredPost.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                walletAddress: true,
                tier: true,
                genesisVerified: true
              }
            }
          }
        }
      },
      orderBy: { pricePaid: 'desc' } // Higher paying sponsors get priority
    })

    res.json({
      success: true,
      sponsoredPosts
    })
})

export const trackView = asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params

    await prisma.sponsoredPost.update({
      where: { postId },
      data: {
        actualViews: { increment: 1 }
      }
    })

    res.json({ success: true })
})

export const trackClick = asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params

    await prisma.sponsoredPost.update({
      where: { postId },
      data: {
        clickCount: { increment: 1 }
      }
    })

    res.json({ success: true })
})

export const getRevenueStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { week, year } = req.query
    
    const weekNumber = week ? parseInt(week as string) : getWeekNumber(new Date())
    const yearNumber = year ? parseInt(year as string) : new Date().getFullYear()

    // Get revenue for specific week
    const weekRevenue = await prisma.sponsoredPost.aggregate({
      where: {
        weekNumber,
        yearNumber
      },
      _sum: {
        pricePaid: true
      }
    })

    // Get pool info
    const { weekStart } = getWeekDates(new Date())
    const pool = await prisma.weeklyRepPool.findUnique({
      where: { weekStartDate: weekStart }
    })

    res.json({
      success: true,
      revenue: {
        week: weekNumber,
        year: yearNumber,
        sponsoredPostRevenue: weekRevenue._sum.pricePaid || 0,
        totalPoolSize: pool?.totalPoolSize || 0,
        distributed: pool?.distributed || false
      }
    })
})