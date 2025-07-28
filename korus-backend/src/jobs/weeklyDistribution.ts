import cron from 'node-cron';
import { distributionService } from '../services/distributionService';
import { logger } from '../utils/logger';

/**
 * Schedule weekly distribution for every Friday at 8:00 PM UTC
 * Cron expression: "0 20 * * 5"
 * - 0: 0 minutes
 * - 20: 20 hours (8 PM)
 * - *: any day of month
 * - *: any month
 * - 5: Friday (0=Sunday, 5=Friday)
 */
export function scheduleWeeklyDistribution() {
  // Schedule for every Friday at 8 PM UTC
  cron.schedule('0 20 * * 5', async () => {
    logger.info('Starting weekly token distribution...');
    
    try {
      await distributionService.runWeeklyDistribution();
      logger.info('Weekly token distribution completed successfully');
    } catch (error) {
      logger.error('Weekly token distribution failed:', error);
      // Could add alerting/notification here
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  logger.info('Weekly distribution cron job scheduled for Fridays at 8:00 PM UTC');
}

/**
 * Manual trigger for testing
 */
export async function triggerDistribution() {
  logger.info('Manually triggering weekly distribution...');
  try {
    await distributionService.runWeeklyDistribution();
    return { success: true };
  } catch (error) {
    logger.error('Manual distribution failed:', error);
    return { success: false, error };
  }
}