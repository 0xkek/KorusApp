import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getVapidPublicKey,
  isWebPushConfigured,
  isValidSubscription,
  saveSubscription,
  removeSubscription,
} from '../services/webPushService';

const router = Router();

// Get all notifications for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userWallet!;
    const unreadOnly = req.query.unread === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      include: {
        fromUser: {
          select: {
            walletAddress: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 notifications
    });

    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.post('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userWallet!;
    const notificationId = req.params.id;

    await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: {
        read: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userWallet!;

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete all notifications for the authenticated user
router.delete('/clear-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userWallet!;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// --- Web push subscription management ---

// Public key for the browser to subscribe with. Unauthenticated: the client
// needs it before it can prompt for permission.
router.get('/push/public-key', (_req, res) => {
  res.json({
    success: true,
    publicKey: getVapidPublicKey(),
    enabled: isWebPushConfigured(),
  });
});

// Register or replace this user's browser push subscription
router.post('/push/subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subscription } = req.body;

    if (!isValidSubscription(subscription)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription' });
    }

    await saveSubscription(req.userWallet!, subscription);
    res.json({ success: true });
  } catch (error) {
    logger.error('Save push subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to save subscription' });
  }
});

/**
 * POST /api/notifications/preferences
 * Turn notifications on or off.
 *
 * pushNotificationsEnabled was read by every send path but nothing could ever
 * write it, so there was no way to opt out. Both the Expo and Web Push senders
 * already respect it.
 */
router.post('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled must be a boolean' });
    }

    await prisma.user.update({
      where: { walletAddress: req.userWallet! },
      data: { pushNotificationsEnabled: enabled },
    });

    res.json({ success: true, pushNotificationsEnabled: enabled });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/notifications/push/register
 * Register an Expo push token for the mobile app.
 *
 * Distinct from /push/subscribe above, which is browser Web Push writing
 * webPushSubscription. This writes User.pushToken, which is what
 * pushNotificationService sends to.
 */
router.post('/push/register', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;

    // Expo tokens look like ExponentPushToken[xxxxxxxx] or ExpoPushToken[...].
    if (typeof token !== 'string' || !/^Exp(o|onent)PushToken\[.+\]$/.test(token)) {
      return res.status(400).json({ success: false, error: 'Invalid Expo push token' });
    }

    await prisma.user.update({
      where: { walletAddress: req.userWallet! },
      data: { pushToken: token },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Register push token error:', error);
    res.status(500).json({ success: false, error: 'Failed to register push token' });
  }
});

/**
 * POST /api/notifications/push/unregister
 * Clear the Expo push token — used on sign-out so a shared device stops
 * receiving the previous account's notifications.
 */
router.post('/push/unregister', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.user.update({
      where: { walletAddress: req.userWallet! },
      data: { pushToken: null },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Unregister push token error:', error);
    res.status(500).json({ success: false, error: 'Failed to unregister push token' });
  }
});

// Unsubscribe this user from browser push
router.post('/push/unsubscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    await removeSubscription(req.userWallet!);
    res.json({ success: true });
  } catch (error) {
    logger.error('Remove push subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove subscription' });
  }
});

export default router;
