import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { emitNotification } from '../config/socket';

const prisma = new PrismaClient();

export async function createNotification({
  userId,
  type,
  fromUserId,
  postId,
  amount,
}: {
  userId: string;
  type: 'like' | 'reply' | 'tip' | 'mention';
  fromUserId: string;
  postId?: string;
  amount?: number;
}) {
  // Don't create notification for self-actions
  if (userId === fromUserId) {
    return;
  }

  // Generate title and message based on type
  const titles: Record<string, string> = {
    like: 'New like on your post',
    reply: 'New reply to your post',
    tip: 'You received a tip!',
    mention: 'You were mentioned',
  };

  const messages: Record<string, string> = {
    like: 'liked your post',
    reply: 'replied to your post',
    tip: `tipped you ${amount || 0} SOL`,
    mention: 'mentioned you in a post',
  };

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title: titles[type] || 'New notification',
        message: messages[type] || 'New activity',
        fromUserId,
        postId,
        amount,
        read: false,
      },
      include: {
        fromUser: {
          select: { walletAddress: true },
        },
        post: {
          select: { id: true, content: true },
        },
      },
    });

    // Push real-time notification via Socket.IO
    emitNotification(userId, notification);
  } catch (error) {
    logger.error('Error creating notification:', error);
  }
}