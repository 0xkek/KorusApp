import { Request, Response } from 'express'
import prisma from '../config/database'

// AuthRequest type
interface AuthRequest extends Request {
  userWallet?: string
}

// ApiResponse type
interface ApiResponse {
  success: boolean
  error?: string
  report?: any
  reports?: any[]
  message?: string
}

// Report reasons enum
const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'] as const
type ReportReason = typeof REPORT_REASONS[number]

// Create a new report
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, targetId, reason, description } = req.body
    const reporterWallet = req.userWallet!

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

    if (!REPORT_REASONS.includes(reason as ReportReason)) {
      return res.status(400).json({ 
        success: false, 
        error: `reason must be one of: ${REPORT_REASONS.join(', ')}` 
      })
    }

    // Check if target exists
    if (targetType === 'post') {
      const post = await prisma.post.findUnique({
        where: { id: targetId }
      })
      if (!post) {
        return res.status(404).json({ 
          success: false, 
          error: 'Post not found' 
        })
      }
    } else if (targetType === 'reply') {
      const reply = await prisma.reply.findUnique({
        where: { id: targetId }
      })
      if (!reply) {
        return res.status(404).json({ 
          success: false, 
          error: 'Reply not found' 
        })
      }
    }

    // Check if user already reported this content
    const existingReport = await prisma.report.findUnique({
      where: {
        reporterWallet_targetId: {
          reporterWallet,
          targetId
        }
      }
    })

    if (existingReport) {
      return res.status(409).json({ 
        success: false, 
        error: 'You have already reported this content' 
      })
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterWallet,
        targetType,
        targetId,
        reason,
        description: description || null
      },
      include: {
        reporter: {
          select: {
            walletAddress: true,
            tier: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      report,
      message: 'Report submitted successfully'
    })
  } catch (error) {
    console.error('Create report error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create report' 
    })
  }
}

// Get reports (for moderators)
export const getReports = async (req: Request, res: Response) => {
  try {
    const { status, targetType, limit = 50, offset = 0 } = req.query

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (targetType) {
      where.targetType = targetType
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Number(limit),
      skip: Number(offset)
    })

    const totalReports = await prisma.report.count({ where })

    res.json({
      success: true,
      reports,
      pagination: {
        total: totalReports,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: totalReports > Number(offset) + Number(limit)
      }
    })
  } catch (error) {
    console.error('Get reports error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch reports' 
    })
  }
}

// Get a specific report
export const getReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      }
    })

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found' 
      })
    }

    res.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Get report error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch report' 
    })
  }
}

// Update report status (for moderators)
export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, moderatorNotes } = req.body

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status is required' 
      })
    }

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be: pending, reviewed, resolved, or dismissed' 
      })
    }

    const report = await prisma.report.findUnique({
      where: { id }
    })

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found' 
      })
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status,
        moderatorNotes: moderatorNotes || report.moderatorNotes,
        resolvedAt: ['resolved', 'dismissed'].includes(status) ? new Date() : null
      },
      include: {
        reporter: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      }
    })

    res.json({
      success: true,
      report: updatedReport,
      message: `Report status updated to ${status}`
    })
  } catch (error) {
    console.error('Update report status error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update report status' 
    })
  }
}

// Get reports for a specific piece of content
export const getContentReports = async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params
    const { targetType } = req.query

    if (!targetType || !['post', 'reply'].includes(targetType as string)) {
      return res.status(400).json({ 
        success: false, 
        error: 'targetType query parameter is required and must be "post" or "reply"' 
      })
    }

    const reports = await prisma.report.findMany({
      where: {
        targetId,
        targetType: targetType as string
      },
      include: {
        reporter: {
          select: {
            walletAddress: true,
            tier: true,
            genesisVerified: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Group reports by reason for analytics
    const reportsByReason = reports.reduce((acc: Record<string, number>, report) => {
      acc[report.reason] = (acc[report.reason] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    res.json({
      success: true,
      reports,
      analytics: {
        totalReports: reports.length,
        reportsByReason,
        reportsByStatus: reports.reduce((acc: Record<string, number>, report) => {
          acc[report.status] = (acc[report.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    })
  } catch (error) {
    console.error('Get content reports error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch content reports' 
    })
  }
}