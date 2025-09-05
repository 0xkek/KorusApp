import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { AuthorizationError } from '../utils/AppError'
import prisma from '../config/database'
import { logger } from '../utils/logger'

/**
 * Middleware to check if user has required tier/role for moderation
 * Tiers: standard, premium, moderator, admin
 */
export const requireModerator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const walletAddress = req.userWallet
    
    if (!walletAddress) {
      throw new AuthorizationError('Authentication required')
    }
    
    // Fetch user from database to get current tier
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { tier: true, isSuspended: true }
    })
    
    if (!user) {
      throw new AuthorizationError('User not found')
    }
    
    if (user.isSuspended) {
      throw new AuthorizationError('Account is suspended')
    }
    
    // Check if user has moderator or admin privileges
    // Allowed tiers: 'moderator', 'admin'
    const allowedTiers = ['moderator', 'admin']
    
    if (!allowedTiers.includes(user.tier)) {
      logger.warn(`Unauthorized moderation attempt by ${walletAddress} with tier: ${user.tier}`)
      throw new AuthorizationError('Insufficient privileges. Moderator access required.')
    }
    
    // User is authorized, proceed
    next()
  } catch (error) {
    // If it's already an AuthorizationError, pass it through
    if (error instanceof AuthorizationError) {
      return next(error)
    }
    
    // Otherwise, wrap in AuthorizationError
    logger.error('Authorization middleware error:', error)
    next(new AuthorizationError('Authorization check failed'))
  }
}

/**
 * Middleware to check if user has admin tier
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const walletAddress = req.userWallet
    
    if (!walletAddress) {
      throw new AuthorizationError('Authentication required')
    }
    
    // Fetch user from database to get current tier
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { tier: true, isSuspended: true }
    })
    
    if (!user) {
      throw new AuthorizationError('User not found')
    }
    
    if (user.isSuspended) {
      throw new AuthorizationError('Account is suspended')
    }
    
    // Check if user has admin privileges
    if (user.tier !== 'admin') {
      logger.warn(`Unauthorized admin attempt by ${walletAddress} with tier: ${user.tier}`)
      throw new AuthorizationError('Insufficient privileges. Admin access required.')
    }
    
    // User is authorized, proceed
    next()
  } catch (error) {
    // If it's already an AuthorizationError, pass it through
    if (error instanceof AuthorizationError) {
      return next(error)
    }
    
    // Otherwise, wrap in AuthorizationError
    logger.error('Authorization middleware error:', error)
    next(new AuthorizationError('Authorization check failed'))
  }
}

/**
 * Middleware to check if user has premium tier or higher
 */
export const requirePremium = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const walletAddress = req.userWallet
    
    if (!walletAddress) {
      throw new AuthorizationError('Authentication required')
    }
    
    // Fetch user from database to get current tier
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { tier: true, isSuspended: true }
    })
    
    if (!user) {
      throw new AuthorizationError('User not found')
    }
    
    if (user.isSuspended) {
      throw new AuthorizationError('Account is suspended')
    }
    
    // Check if user has premium tier or higher
    // Allowed tiers: 'premium', 'moderator', 'admin'
    const allowedTiers = ['premium', 'moderator', 'admin']
    
    if (!allowedTiers.includes(user.tier)) {
      logger.warn(`Unauthorized premium attempt by ${walletAddress} with tier: ${user.tier}`)
      throw new AuthorizationError('Premium access required.')
    }
    
    // User is authorized, proceed
    next()
  } catch (error) {
    // If it's already an AuthorizationError, pass it through
    if (error instanceof AuthorizationError) {
      return next(error)
    }
    
    // Otherwise, wrap in AuthorizationError
    logger.error('Authorization middleware error:', error)
    next(new AuthorizationError('Authorization check failed'))
  }
}