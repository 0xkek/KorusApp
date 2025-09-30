import { logger } from '../utils/logger'
import { SubscriptionService } from '../services/subscriptionService'

/**
 * Start the subscription expiration check job
 * Runs every hour to check for expired subscriptions
 */
export function startSubscriptionExpirationJob() {
  // Run check immediately on startup
  SubscriptionService.checkExpiredSubscriptions().catch(error => {
    logger.error('Initial subscription expiration check failed:', error)
  })
  
  // Schedule to run every hour
  const intervalId = setInterval(() => {
    SubscriptionService.checkExpiredSubscriptions().catch(error => {
      logger.error('Scheduled subscription expiration check failed:', error)
    })
  }, 60 * 60 * 1000) // 1 hour in milliseconds
  
  logger.info('Subscription expiration job started (runs every hour)')
  
  // Return cleanup function for graceful shutdown
  return () => {
    clearInterval(intervalId)
    logger.info('Subscription expiration job stopped')
  }
}