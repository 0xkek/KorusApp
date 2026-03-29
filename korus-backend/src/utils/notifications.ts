import prisma from '../config/database';
import { logger } from './logger';
import { emitNotification } from '../config/socket';

export async function createNotification({
  userId,
  type,
  fromUserId,
  postId,
  amount,
}: {
  userId: string;
  type: 'like' | 'reply' | 'tip' | 'mention' | 'follow' | 'game_joined' | 'game_move' | 'game_round' | 'game_completed';
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
    follow: 'New follower',
    game_joined: 'Someone joined your game!',
    game_move: 'Your turn to play!',
    game_round: 'New round started!',
    game_completed: 'Game finished!',
  };

  const messages: Record<string, string> = {
    like: 'liked your post',
    reply: 'replied to your post',
    tip: `tipped you ${amount || 0} SOL`,
    mention: 'mentioned you in a post',
    follow: 'started following you',
    game_joined: 'joined your game',
    game_move: 'made a move — your turn!',
    game_round: 'New round — make your choice!',
    game_completed: `Game over! ${amount ? `Wager: ${amount} SOL` : ''}`,
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