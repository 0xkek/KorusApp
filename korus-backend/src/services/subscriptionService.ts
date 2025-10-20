import { logger } from '../utils/logger'
import prisma from '../config/database'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Decimal } from '@prisma/client/runtime/library'

// Subscription pricing in SOL
export const SUBSCRIPTION_PRICES = {
  monthly: 0.1,  // 0.1 SOL per month
  yearly: 1.0    // 1 SOL per year (2 months free)
}

// Duration in days
const SUBSCRIPTION_DURATIONS = {
  monthly: 30,
  yearly: 365
}

export class SubscriptionService {
  private static connection: Connection

  static initialize() {
    // Use SOLANA_RPC_URL from environment, fallback to mainnet/devnet based on NODE_ENV
    const rpcUrl = process.env.SOLANA_RPC_URL || (
      process.env.NODE_ENV === 'production'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com'
    )

    this.connection = new Connection(rpcUrl, 'confirmed')
    logger.info('Subscription service initialized', { rpcUrl })
  }

  /**
   * Process a subscription payment
   */
  static async processSubscription(
    walletAddress: string,
    subscriptionType: 'monthly' | 'yearly',
    txSignature: string
  ) {
    try {
      logger.info('Processing subscription', { walletAddress, subscriptionType, txSignature })
      
      // Verify the transaction
      const isValid = await this.verifyTransaction(txSignature, SUBSCRIPTION_PRICES[subscriptionType])
      
      if (!isValid) {
        throw new Error('Invalid transaction signature or amount')
      }
      
      // Calculate subscription period
      const now = new Date()
      const durationDays = SUBSCRIPTION_DURATIONS[subscriptionType]
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
      
      // Update user subscription
      const user = await prisma.user.update({
        where: { walletAddress },
        data: {
          tier: 'premium',
          subscriptionType,
          subscriptionStatus: 'active',
          subscriptionStartDate: now,
          subscriptionEndDate: endDate,
          subscriptionPrice: new Decimal(SUBSCRIPTION_PRICES[subscriptionType]),
          lastPaymentDate: now,
          lastPaymentAmount: new Decimal(SUBSCRIPTION_PRICES[subscriptionType]),
          lastPaymentTxSignature: txSignature
        }
      })
      
      // Record payment
      await prisma.subscriptionPayment.create({
        data: {
          walletAddress,
          subscriptionType,
          amount: new Decimal(SUBSCRIPTION_PRICES[subscriptionType]),
          txSignature,
          periodStart: now,
          periodEnd: endDate
        }
      })
      
      logger.info('Subscription activated', { 
        walletAddress, 
        subscriptionType,
        endDate 
      })
      
      return {
        success: true,
        subscription: {
          type: subscriptionType,
          status: 'active',
          startDate: now,
          endDate,
          price: SUBSCRIPTION_PRICES[subscriptionType]
        }
      }
    } catch (error) {
      logger.error('Failed to process subscription:', error)
      throw error
    }
  }

  /**
   * Verify a transaction signature and amount
   */
  static async verifyTransaction(
    signature: string,
    expectedAmount: number
  ): Promise<boolean> {
    try {
      // In development, skip verification for testing
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_TX_VERIFICATION === 'true') {
        logger.warn('Skipping transaction verification in development')
        return true
      }
      
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      })
      
      if (!transaction) {
        logger.error('Transaction not found', { signature })
        return false
      }
      
      // Check if transaction was successful
      if (transaction.meta?.err) {
        logger.error('Transaction failed', { signature, error: transaction.meta.err })
        return false
      }
      
      // Verify amount sent to treasury wallet (same as shoutouts/tips)
      const { TREASURY_WALLET } = await import('../config/solana')
      const platformPubkey = TREASURY_WALLET
      const accountKeys = transaction.transaction.message.getAccountKeys()
      
      // Find platform wallet in transaction
      const platformIndex = accountKeys.staticAccountKeys.findIndex(
        key => key.equals(platformPubkey)
      )
      
      if (platformIndex === -1) {
        logger.error('Platform wallet not found in transaction', { signature })
        return false
      }
      
      // Verify amount
      const preBalance = transaction.meta?.preBalances[platformIndex] || 0
      const postBalance = transaction.meta?.postBalances[platformIndex] || 0
      const received = (postBalance - preBalance) / LAMPORTS_PER_SOL
      
      // Allow 1% variance for fees
      if (received < expectedAmount * 0.99) {
        logger.error('Incorrect amount received', { 
          expected: expectedAmount, 
          received, 
          signature 
        })
        return false
      }
      
      logger.info('Transaction verified', { signature, amount: received })
      return true
    } catch (error) {
      logger.error('Transaction verification failed', { error, signature })
      return false
    }
  }

  /**
   * Check and update expired subscriptions
   */
  static async checkExpiredSubscriptions() {
    try {
      const now = new Date()
      
      // Find all expired subscriptions
      const expiredUsers = await prisma.user.findMany({
        where: {
          subscriptionStatus: 'active',
          subscriptionEndDate: {
            lt: now
          }
        }
      })
      
      if (expiredUsers.length > 0) {
        // Update expired subscriptions
        await prisma.user.updateMany({
          where: {
            walletAddress: {
              in: expiredUsers.map(u => u.walletAddress)
            }
          },
          data: {
            tier: 'standard',
            subscriptionStatus: 'expired'
          }
        })
        
        logger.info(`Updated ${expiredUsers.length} expired subscriptions`)
      }
      
      return expiredUsers.length
    } catch (error) {
      logger.error('Failed to check expired subscriptions:', error)
      throw error
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(walletAddress: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { walletAddress }
      })
      
      if (!user || user.subscriptionStatus !== 'active') {
        throw new Error('No active subscription found')
      }
      
      // Keep premium until end of current period
      await prisma.user.update({
        where: { walletAddress },
        data: {
          subscriptionStatus: 'cancelled'
          // Keep tier as 'premium' until subscriptionEndDate
        }
      })
      
      logger.info('Subscription cancelled', { walletAddress })
      
      return {
        success: true,
        message: 'Subscription cancelled. Premium access will continue until ' + user.subscriptionEndDate
      }
    } catch (error) {
      logger.error('Failed to cancel subscription:', error)
      throw error
    }
  }

  /**
   * Get subscription status for a user
   */
  static async getSubscriptionStatus(walletAddress: string) {
    try {
      console.log('🔍 [Service] Querying database for wallet:', walletAddress)

      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: {
          tier: true,
          subscriptionType: true,
          subscriptionStatus: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
          subscriptionPrice: true
        }
      })

      console.log('📊 [Service] Database returned user:', {
        found: !!user,
        tier: user?.tier,
        subscriptionStatus: user?.subscriptionStatus,
        subscriptionType: user?.subscriptionType
      })

      if (!user || !user.subscriptionStatus || user.subscriptionStatus === 'inactive') {
        console.log('❌ [Service] Returning inactive status - reason:', {
          userExists: !!user,
          hasSubscriptionStatus: !!user?.subscriptionStatus,
          status: user?.subscriptionStatus
        })
        return {
          hasSubscription: false,
          status: 'inactive',
          isPremium: false
        }
      }

      const isPremium = user.tier === 'premium'
      console.log('✅ [Service] Returning active status:', {
        tier: user.tier,
        isPremium,
        status: user.subscriptionStatus
      })

      return {
        hasSubscription: true,
        status: user.subscriptionStatus,
        type: user.subscriptionType,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        price: user.subscriptionPrice,
        isPremium
      }
    } catch (error) {
      logger.error('Failed to get subscription status:', error)
      throw error
    }
  }
}

// Initialize on import
SubscriptionService.initialize()

export default SubscriptionService