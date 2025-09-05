import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'

interface AuthRequest extends Request {
  userWallet?: string
}

interface ApiResponse {
  success: boolean
  error?: string
  message?: string
  data?: any
}

// Action types enum
const ACTION_TYPES = ['hide', 'warn', 'suspend', 'unsuspend', 'delete'] as const
type ActionType = typeof ACTION_TYPES[number]

// Target types enum
const TARGET_TYPES = ['user', 'post', 'reply'] as const
type TargetType = typeof TARGET_TYPES[number]

// Check if moderation is enabled
const isModerationEnabled = () => {
  return process.env.ENABLE_MODERATION === 'true'
}

// Hide content (posts/replies)
export const hideContent = async (req: AuthRequest, res: Response) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'Moderation system is currently disabled'
    })
  }
  
  try {
    const { targetType, targetId, reason, reportId } = req.body
    const moderatorWallet = req.userWallet!

    // Validate input
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetType, targetId, reason'
      })
    }

    if (!['post', 'reply'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: 'targetType must be either "post" or "reply"'
      })
    }

    // Check if target exists and hide it
    if (targetType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: targetId } })
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' })
      }

      await prisma.post.update({
        where: { id: targetId },
        data: { 
          isHidden: true, 
          moderationReason: reason 
        }
      })
    } else {
      const reply = await prisma.reply.findUnique({ where: { id: targetId } })
      if (!reply) {
        return res.status(404).json({ success: false, error: 'Reply not found' })
      }

      await prisma.reply.update({
        where: { id: targetId },
        data: { 
          isHidden: true, 
          moderationReason: reason 
        }
      })
    }

    // Create moderation action record
    const moderationAction = await prisma.moderationAction.create({
      data: {
        moderatorWallet,
        targetType,
        targetId,
        actionType: 'hide',
        reason,
        reportId: reportId || null
      }
    })

    // Update related report if provided
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { 
          status: 'resolved',
          resolvedAt: new Date(),
          moderatorNotes: `Content hidden: ${reason}`
        }
      })
    }

    res.json({
      success: true,
      message: `${targetType} hidden successfully`,
      data: moderationAction
    })
  } catch (error) {
    logger.error('Hide content error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to hide content' 
    })
  }
}

// Suspend user
export const suspendUser = async (req: AuthRequest, res: Response) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'Moderation system is currently disabled'
    })
  }
  
  try {
    const { targetWallet, reason, duration, reportId } = req.body
    const moderatorWallet = req.userWallet!

    // Validate input
    if (!targetWallet || !reason || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetWallet, reason, duration'
      })
    }

    if (duration < 1 || duration > 8760) { // Max 1 year
      return res.status(400).json({
        success: false,
        error: 'Duration must be between 1 and 8760 hours'
      })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { walletAddress: targetWallet } 
    })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Calculate suspension end time
    const suspendedUntil = new Date()
    suspendedUntil.setHours(suspendedUntil.getHours() + duration)

    // Suspend user
    await prisma.user.update({
      where: { walletAddress: targetWallet },
      data: {
        isSuspended: true,
        suspensionReason: reason,
        suspendedUntil
      }
    })

    // Create moderation action record
    const moderationAction = await prisma.moderationAction.create({
      data: {
        moderatorWallet,
        targetType: 'user',
        targetId: targetWallet,
        actionType: 'suspend',
        reason,
        duration,
        reportId: reportId || null
      }
    })

    // Update related report if provided
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { 
          status: 'resolved',
          resolvedAt: new Date(),
          moderatorNotes: `User suspended for ${duration} hours: ${reason}`
        }
      })
    }

    res.json({
      success: true,
      message: `User suspended for ${duration} hours`,
      data: { moderationAction, suspendedUntil }
    })
  } catch (error) {
    logger.error('Suspend user error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to suspend user' 
    })
  }
}

// Warn user (increment warning count)
export const warnUser = async (req: AuthRequest, res: Response) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'Moderation system is currently disabled'
    })
  }
  
  try {
    const { targetWallet, reason, reportId } = req.body
    const moderatorWallet = req.userWallet!

    // Validate input
    if (!targetWallet || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetWallet, reason'
      })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { walletAddress: targetWallet } 
    })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Increment warning count
    await prisma.user.update({
      where: { walletAddress: targetWallet },
      data: {
        warningCount: { increment: 1 }
      }
    })

    // Create moderation action record
    const moderationAction = await prisma.moderationAction.create({
      data: {
        moderatorWallet,
        targetType: 'user',
        targetId: targetWallet,
        actionType: 'warn',
        reason,
        reportId: reportId || null
      }
    })

    // Update related report if provided
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { 
          status: 'resolved',
          resolvedAt: new Date(),
          moderatorNotes: `User warned: ${reason}`
        }
      })
    }

    const updatedUser = await prisma.user.findUnique({
      where: { walletAddress: targetWallet },
      select: { warningCount: true }
    })

    res.json({
      success: true,
      message: 'User warned successfully',
      data: { 
        moderationAction, 
        newWarningCount: updatedUser?.warningCount 
      }
    })
  } catch (error) {
    logger.error('Warn user error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to warn user' 
    })
  }
}

// Unsuspend user
export const unsuspendUser = async (req: AuthRequest, res: Response) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'Moderation system is currently disabled'
    })
  }
  
  try {
    const { targetWallet, reason } = req.body
    const moderatorWallet = req.userWallet!

    // Validate input
    if (!targetWallet || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetWallet, reason'
      })
    }

    // Check if user exists and is suspended
    const user = await prisma.user.findUnique({ 
      where: { walletAddress: targetWallet } 
    })
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    if (!user.isSuspended) {
      return res.status(400).json({ 
        success: false, 
        error: 'User is not currently suspended' 
      })
    }

    // Unsuspend user
    await prisma.user.update({
      where: { walletAddress: targetWallet },
      data: {
        isSuspended: false,
        suspensionReason: null,
        suspendedUntil: null
      }
    })

    // Create moderation action record
    const moderationAction = await prisma.moderationAction.create({
      data: {
        moderatorWallet,
        targetType: 'user',
        targetId: targetWallet,
        actionType: 'unsuspend',
        reason
      }
    })

    res.json({
      success: true,
      message: 'User unsuspended successfully',
      data: moderationAction
    })
  } catch (error) {
    logger.error('Unsuspend user error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to unsuspend user' 
    })
  }
}

// Get moderation dashboard data
export const getModerationDashboard = async (req: Request, res: Response) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'Moderation system is currently disabled'
    })
  }
  
  try {
    const { timeframe = '24h' } = req.query
    
    // Calculate time range
    const now = new Date()
    let startTime = new Date()
    switch (timeframe) {
      case '1h':
        startTime.setHours(now.getHours() - 1)
        break
      case '24h':
        startTime.setDate(now.getDate() - 1)
        break
      case '7d':
        startTime.setDate(now.getDate() - 7)
        break
      case '30d':
        startTime.setDate(now.getDate() - 30)
        break
      default:
        startTime.setDate(now.getDate() - 1)
    }

    // Get pending reports count
    const pendingReports = await prisma.report.count({
      where: { status: 'pending' }
    })

    // Get recent moderation actions
    const recentActions = await prisma.moderationAction.findMany({
      where: {
        createdAt: { gte: startTime }
      },
      include: {
        moderator: {
          select: { walletAddress: true, tier: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Get content stats
    const [hiddenPosts, hiddenReplies, suspendedUsers] = await Promise.all([
      prisma.post.count({ where: { isHidden: true } }),
      prisma.reply.count({ where: { isHidden: true } }),
      prisma.user.count({ where: { isSuspended: true } })
    ])

    // Get flagged content (most reported)
    const flaggedContent = await Promise.all([
      prisma.post.findMany({
        where: { flaggedCount: { gt: 0 } },
        orderBy: { flaggedCount: 'desc' },
        take: 10,
        include: {
          author: {
            select: { walletAddress: true, tier: true }
          }
        }
      }),
      prisma.reply.findMany({
        where: { flaggedCount: { gt: 0 } },
        orderBy: { flaggedCount: 'desc' },
        take: 10,
        include: {
          author: {
            select: { walletAddress: true, tier: true }
          }
        }
      })
    ])

    res.json({
      success: true,
      data: {
        summary: {
          pendingReports,
          hiddenPosts,
          hiddenReplies,
          suspendedUsers
        },
        recentActions,
        flaggedContent: {
          posts: flaggedContent[0],
          replies: flaggedContent[1]
        },
        timeframe
      }
    })
  } catch (error) {
    logger.error('Get moderation dashboard error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch moderation dashboard' 
    })
  }
}

// Get moderation history for specific content
export const getModerationHistory = async (req: Request, res: Response) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'Moderation system is currently disabled'
    })
  }
  
  try {
    const { targetType, targetId } = req.params

    if (!['user', 'post', 'reply'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: 'targetType must be "user", "post", or "reply"'
      })
    }

    const actions = await prisma.moderationAction.findMany({
      where: {
        targetType,
        targetId
      },
      include: {
        moderator: {
          select: { walletAddress: true, tier: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: actions
    })
  } catch (error) {
    logger.error('Get moderation history error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch moderation history' 
    })
  }
}

// Auto-moderate content based on rules
export const autoModerate = async (targetType: string, targetId: string, content: string) => {
  // Check if moderation is enabled
  if (!isModerationEnabled()) {
    logger.debug('Auto-moderation skipped: moderation system disabled')
    return { flagged: false, reasons: [] }
  }
  try {
    let shouldFlag = false
    let flagReason = ''

    // Simple auto-moderation rules
    const spamPatterns = [
      /(.)\1{10,}/g, // Repeated characters
      /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
      /[A-Z]{20,}/g, // Excessive caps
    ]

    const inappropriatePatterns = [
      /fuck|shit|damn|bitch/gi, // Basic profanity filter
      /\b(scam|phishing|hack|steal)\b/gi, // Security threats
    ]

    // Check for spam patterns
    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        shouldFlag = true
        flagReason = 'Potential spam detected'
        break
      }
    }

    // Check for inappropriate content
    if (!shouldFlag) {
      for (const pattern of inappropriatePatterns) {
        if (pattern.test(content)) {
          shouldFlag = true
          flagReason = 'Inappropriate content detected'
          break
        }
      }
    }

    // If content should be flagged, increment flag count
    if (shouldFlag) {
      if (targetType === 'post') {
        await prisma.post.update({
          where: { id: targetId },
          data: { flaggedCount: { increment: 1 } }
        })
      } else if (targetType === 'reply') {
        await prisma.reply.update({
          where: { id: targetId },
          data: { flaggedCount: { increment: 1 } }
        })
      }

      // Create auto-moderation action
      await prisma.moderationAction.create({
        data: {
          moderatorWallet: 'system', // System-generated action
          targetType,
          targetId,
          actionType: 'warn',
          reason: `Auto-moderation: ${flagReason}`
        }
      })

      return { flagged: true, reason: flagReason }
    }

    return { flagged: false }
  } catch (error) {
    logger.error('Auto-moderation error:', error)
    return { flagged: false, error: 'Auto-moderation failed' }
  }
}