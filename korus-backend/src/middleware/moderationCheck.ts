import { Response, NextFunction } from 'express'
import prisma from '../config/database'
import { AuthRequest } from './auth'

// Middleware to check if user is suspended
export const checkSuspension = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userWallet = req.userWallet!
    
    // Get user suspension status
    const user = await prisma.user.findUnique({
      where: { walletAddress: userWallet },
      select: {
        isSuspended: true,
        suspendedUntil: true,
        suspensionReason: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Check if user is currently suspended
    if (user.isSuspended) {
      const now = new Date()
      
      // If suspension has expired, automatically unsuspend
      if (user.suspendedUntil && user.suspendedUntil <= now) {
        await prisma.user.update({
          where: { walletAddress: userWallet },
          data: {
            isSuspended: false,
            suspensionReason: null,
            suspendedUntil: null
          }
        })
        
        console.log(`Auto-unsuspended user: ${userWallet}`)
        next()
      } else {
        // User is still suspended
        const suspendedUntil = user.suspendedUntil 
          ? user.suspendedUntil.toISOString() 
          : 'indefinitely'
          
        return res.status(403).json({
          success: false,
          error: 'Your account is suspended',
          details: {
            reason: user.suspensionReason,
            suspendedUntil,
            message: user.suspendedUntil 
              ? `Your account is suspended until ${user.suspendedUntil.toLocaleDateString()}`
              : 'Your account is suspended indefinitely'
          }
        })
      }
    } else {
      next()
    }
  } catch (error) {
    console.error('Suspension check error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check user status'
    })
  }
}

// Middleware to check if user has too many warnings
export const checkWarnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userWallet = req.userWallet!
    
    const user = await prisma.user.findUnique({
      where: { walletAddress: userWallet },
      select: { warningCount: true }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // If user has 5+ warnings, show warning message but don't block
    if (user.warningCount >= 5) {
      console.log(`User ${userWallet} has ${user.warningCount} warnings - monitoring activity`)
      
      // Add warning header but continue
      res.setHeader('X-Moderation-Warning', `You have ${user.warningCount} warnings. Please follow community guidelines.`)
    }

    next()
  } catch (error) {
    console.error('Warning check error:', error)
    next() // Don't block on warning check failure
  }
}