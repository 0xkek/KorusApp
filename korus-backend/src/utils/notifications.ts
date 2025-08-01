import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createNotification({
  userId,
  type,
  fromUserId,
  postId,
  replyId,
  amount,
}: {
  userId: string;
  type: 'like' | 'reply' | 'tip' | 'bump' | 'follow' | 'mention';
  fromUserId: string;
  postId?: string;
  replyId?: string;
  amount?: number;
}) {
  // Don't create notification for self-actions
  if (userId === fromUserId) {
    return;
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        fromUserId,
        postId,
        replyId,
        amount,
        read: false,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}