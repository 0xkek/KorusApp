import { logger } from '../utils/logger'
import prisma from '../config/database'

/**
 * Cleanup expired shoutout posts
 * This job runs periodically to remove shoutout posts that have been expired for more than 24 hours
 */
export async function cleanupExpiredShoutouts() {
  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Find expired shoutout posts that have been expired for more than 24 hours
    const expiredShoutouts = await prisma.post.deleteMany({
      where: {
        isShoutout: true,
        shoutoutExpiresAt: {
          lt: twentyFourHoursAgo // Less than 24 hours ago (expired for more than 24 hours)
        }
      }
    })
    
    if (expiredShoutouts.count > 0) {
      logger.info(`Cleaned up ${expiredShoutouts.count} expired shoutout posts`)
    }
    
    return expiredShoutouts.count
  } catch (error) {
    logger.error('Failed to cleanup expired shoutouts:', error)
    throw error
  }
}

/**
 * Start the cleanup job scheduler
 * Runs every hour to check for expired shoutouts
 */
export function startShoutoutCleanupJob() {
  // Run cleanup immediately on startup
  cleanupExpiredShoutouts().catch(error => {
    logger.error('Initial shoutout cleanup failed:', error)
  })
  
  // Schedule to run every hour
  const intervalId = setInterval(() => {
    cleanupExpiredShoutouts().catch(error => {
      logger.error('Scheduled shoutout cleanup failed:', error)
    })
  }, 60 * 60 * 1000) // 1 hour in milliseconds
  
  logger.info('Shoutout cleanup job started (runs every hour)')
  
  // Return cleanup function for graceful shutdown
  return () => {
    clearInterval(intervalId)
    logger.info('Shoutout cleanup job stopped')
  }
}