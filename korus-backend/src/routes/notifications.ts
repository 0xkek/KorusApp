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
