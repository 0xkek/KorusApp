import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { SubscriptionService, SUBSCRIPTION_PRICES } from '../services/subscriptionService'

/**
 * Get subscription pricing
 */
export const getSubscriptionPricing = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      pricing: {
        monthly: {
          price: SUBSCRIPTION_PRICES.monthly,
          currency: 'SOL',
          duration: '30 days',
          features: [
            'Hide sponsored posts',
            'Premium badge',
            'Unlimited username changes',
            'Priority support',
            'Early access to new features'
          ]
        },
        yearly: {
          price: SUBSCRIPTION_PRICES.yearly,
          currency: 'SOL',
          duration: '365 days',
          savings: '2 months free',
          features: [
            'Hide sponsored posts',
            'Premium badge',
            'Unlimited username changes',
            'Priority support',
            'Early access to new features',
            '2 months free (compared to monthly)'
          ]
        }
      },
      platformWallet: process.env.PLATFORM_WALLET_ADDRESS
    })
  } catch (error) {
    logger.error('Get pricing error:', error)
    res.status(500).json({ success: false, error: 'Failed to get pricing' })
  }
}

/**
 * Process subscription payment
 */
export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    const { subscriptionType, txSignature } = req.body
    
    // Validate input
    if (!subscriptionType || !['monthly', 'yearly'].includes(subscriptionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription type. Must be "monthly" or "yearly"'
      })
    }
    
    if (!txSignature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature required'
      })
    }
    
    // Process subscription
    const result = await SubscriptionService.processSubscription(
      walletAddress,
      subscriptionType,
      txSignature
    )
    
    res.json({
      success: true,
      subscription: result.subscription
    })
  } catch (error: any) {
    logger.error('Subscribe error:', error)
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to process subscription' 
    })
  }
}

/**
 * Get subscription status
 */
export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    
    const status = await SubscriptionService.getSubscriptionStatus(walletAddress)
    
    res.json({
      success: true,
      subscription: status
    })
  } catch (error) {
    logger.error('Get subscription status error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get subscription status' 
    })
  }
}

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    
    const result = await SubscriptionService.cancelSubscription(walletAddress)
    
    res.json({
      success: true,
      message: result.message
    })
  } catch (error: any) {
    logger.error('Cancel subscription error:', error)
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to cancel subscription' 
    })
  }
}

/**
 * Get subscription history
 */
export const getSubscriptionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.userWallet!
    
    const payments = await import('../config/database').then(m => 
      m.default.subscriptionPayment.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    )
    
    res.json({
      success: true,
      payments: payments.map(p => ({
        id: p.id,
        type: p.subscriptionType,
        amount: p.amount.toString(),
        txSignature: p.txSignature,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        date: p.createdAt
      }))
    })
  } catch (error) {
    logger.error('Get subscription history error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get subscription history' 
    })
  }
}