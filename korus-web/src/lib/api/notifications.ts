import { api } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  fromUserId: string | null;
  postId: string | null;
  amount: number | null;
  createdAt: string;
  fromUser?: {
    walletAddress: string;
  };
  post?: {
    id: string;
    content: string;
  };
}

export interface NotificationsResponse {
  notifications: Notification[];
}

export interface MarkReadResponse {
  success: boolean;
}

export const notificationsAPI = {
  /**
   * Get all notifications for the authenticated user
   */
  async getNotifications(token: string, unreadOnly = false): Promise<NotificationsResponse> {
    const queryParam = unreadOnly ? '?unread=true' : '';
    return api.get(`/api/notifications${queryParam}`, token);
  },

  /**
   * Mark a specific notification as read
   */
  async markAsRead(notificationId: string, token: string): Promise<MarkReadResponse> {
    return api.post(`/api/notifications/${notificationId}/read`, {}, token);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(token: string): Promise<MarkReadResponse> {
    return api.post('/api/notifications/read-all', {}, token);
  },

  /**
   * Delete all notifications
   */
  async clearAll(token: string): Promise<MarkReadResponse> {
    return api.delete('/api/notifications/clear-all', token);
  },

  /**
   * VAPID public key for browser push. `enabled` is false when the server
   * has no keys configured, in which case push should stay hidden.
   */
  async getPushPublicKey(): Promise<{ success: boolean; publicKey: string | null; enabled: boolean }> {
    return api.get('/api/notifications/push/public-key');
  },

  async subscribeToPush(subscription: PushSubscriptionJSON, token: string): Promise<{ success: boolean }> {
    return api.post('/api/notifications/push/subscribe', { subscription }, token);
  },

  async unsubscribeFromPush(token: string): Promise<{ success: boolean }> {
    return api.post('/api/notifications/push/unsubscribe', {}, token);
  }
};
