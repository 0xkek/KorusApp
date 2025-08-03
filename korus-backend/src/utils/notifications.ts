import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createNotification({
  userId,
  type,
  fromUserId,
  postId,
  amount,
}: {
  userId: string;
  type: 'like' | 'reply' | 'tip' | 'bump' | 'follow' | 'mention';
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
    bump: 'Your post was bumped!',
    follow: 'New follower',
    mention: 'You were mentioned',
  };

  const messages: Record<string, string> = {
    like: 'liked your post',
    reply: 'replied to your post',
    tip: `tipped you ${amount || 0} SOL`,
    bump: 'bumped your post',
    follow: 'started following you',
    mention: 'mentioned you in a post',
  };

  try {
    await prisma.notification.create({
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
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}