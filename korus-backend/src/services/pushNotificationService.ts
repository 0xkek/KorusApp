import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import prisma from '../config/database';

// Create a new Expo SDK client
const expo = new Expo();

export interface PushNotificationData {
  to: string; // Push token
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
}

class PushNotificationService {
  /**
   * Send a single push notification
   */
  async sendNotification(notification: PushNotificationData): Promise<void> {
    // Check that the push token is valid
    if (!Expo.isExpoPushToken(notification.to)) {
      console.error(`Push token ${notification.to} is not a valid Expo push token`);
      return;
    }

    const message: ExpoPushMessage = {
      to: notification.to,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      badge: notification.badge,
    };

    try {
      const chunks = expo.chunkPushNotifications([message]);
      const tickets: ExpoPushTicket[] = [];
      
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      // Handle errors
      tickets.forEach((ticket) => {
        if (ticket.status === 'error') {
          console.error('Error sending notification:', ticket.message);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // Remove invalid token from database
            this.removeInvalidToken(notification.to);
          }
        }
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBulkNotifications(notifications: PushNotificationData[]): Promise<void> {
    const messages: ExpoPushMessage[] = [];
    
    for (const notification of notifications) {
      if (Expo.isExpoPushToken(notification.to)) {
        messages.push({
          to: notification.to,
          sound: notification.sound || 'default',
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          badge: notification.badge,
        });
      }
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Failed to send bulk notifications:', error);
      }
    }
  }

  /**
   * Save or update user's push token
   */
  async savePushToken(walletAddress: string, pushToken: string): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error('Invalid Expo push token');
    }

    try {
      await prisma.user.update({
        where: { walletAddress },
        data: { pushToken },
      });
      // console.log(`Push token saved for user ${walletAddress}`);
    } catch (error) {
      console.error('Failed to save push token:', error);
      throw error;
    }
  }

  /**
   * Remove invalid push token
   */
  private async removeInvalidToken(pushToken: string): Promise<void> {
    try {
      await prisma.user.updateMany({
        where: { pushToken },
        data: { pushToken: null },
      });
      // console.log(`Removed invalid push token: ${pushToken}`);
    } catch (error) {
      console.error('Failed to remove invalid token:', error);
    }
  }

  /**
   * Send notification for new like
   */
  async sendLikeNotification(
    postAuthorWallet: string,
    likerWallet: string,
    postContent: string
  ): Promise<void> {
    try {
      // Get the post author's push token
      const author = await prisma.user.findUnique({
        where: { walletAddress: postAuthorWallet },
        select: { pushToken: true, pushNotificationsEnabled: true },
      });

      if (!author?.pushToken || !author.pushNotificationsEnabled) {
        return;
      }

      // Get liker's display name
      const liker = await prisma.user.findUnique({
        where: { walletAddress: likerWallet },
        select: { displayName: true, snsUsername: true },
      });

      const likerName = liker?.displayName || liker?.snsUsername || 'Someone';
      const truncatedContent = postContent.length > 50 
        ? postContent.substring(0, 50) + '...' 
        : postContent;

      await this.sendNotification({
        to: author.pushToken,
        title: '❤️ New Like',
        body: `${likerName} liked your post: "${truncatedContent}"`,
        data: { type: 'like', postId: postContent },
      });
    } catch (error) {
      console.error('Failed to send like notification:', error);
    }
  }

  /**
   * Send notification for new reply
   */
  async sendReplyNotification(
    postAuthorWallet: string,
    replierWallet: string,
    replyContent: string,
    postId: string
  ): Promise<void> {
    try {
      const author = await prisma.user.findUnique({
        where: { walletAddress: postAuthorWallet },
        select: { pushToken: true, pushNotificationsEnabled: true },
      });

      if (!author?.pushToken || !author.pushNotificationsEnabled) {
        return;
      }

      const replier = await prisma.user.findUnique({
        where: { walletAddress: replierWallet },
        select: { displayName: true, snsUsername: true },
      });

      const replierName = replier?.displayName || replier?.snsUsername || 'Someone';
      const truncatedContent = replyContent.length > 50 
        ? replyContent.substring(0, 50) + '...' 
        : replyContent;

      await this.sendNotification({
        to: author.pushToken,
        title: '💬 New Reply',
        body: `${replierName} replied: "${truncatedContent}"`,
        data: { type: 'reply', postId },
      });
    } catch (error) {
      console.error('Failed to send reply notification:', error);
    }
  }

  /**
   * Send notification for new tip
   */
  async sendTipNotification(
    recipientWallet: string,
    senderWallet: string,
    amount: number
  ): Promise<void> {
    try {
      const recipient = await prisma.user.findUnique({
        where: { walletAddress: recipientWallet },
        select: { pushToken: true, pushNotificationsEnabled: true },
      });

      if (!recipient?.pushToken || !recipient.pushNotificationsEnabled) {
        return;
      }

      const sender = await prisma.user.findUnique({
        where: { walletAddress: senderWallet },
        select: { displayName: true, snsUsername: true },
      });

      const senderName = sender?.displayName || sender?.snsUsername || 'Someone';

      await this.sendNotification({
        to: recipient.pushToken,
        title: '💰 New Tip!',
        body: `${senderName} tipped you ${amount} SOL!`,
        data: { type: 'tip', amount },
      });
    } catch (error) {
      console.error('Failed to send tip notification:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();