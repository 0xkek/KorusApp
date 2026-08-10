import { api } from './client';

/**
 * GET /api/notifications returns at most the 50 most recent, newest first.
 * There is no pagination on this endpoint.
 *
 * Note `message` is stored without a subject — "liked your post", not
 * "alice liked your post" — and `fromUser` carries only the wallet address, so
 * the sender has to be prepended client-side. See notificationText().
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'reply' | 'follow' | 'tip' | string;
  title: string;
  message: string;
  read: boolean;
  fromUserId: string | null;
  postId: string | null;
  amount: string | number | null;
  createdAt: string;
  fromUser: { walletAddress: string } | null;
  post: { id: string; content: string } | null;
}

export const notificationsAPI = {
  list: (token: string, unreadOnly = false) =>
    api.get<{ notifications: Notification[] }>(
      `/api/notifications${unreadOnly ? '?unread=true' : ''}`,
      token
    ),

  markRead: (id: string, token: string) =>
    api.post<{ success: boolean }>(`/api/notifications/${id}/read`, {}, token),

  markAllRead: (token: string) =>
    api.post<{ success: boolean }>('/api/notifications/read-all', {}, token),

  /**
   * Save this device's Expo push token. Distinct from /push/subscribe, which
   * is browser Web Push writing a different field.
   */
  registerPushToken: (expoToken: string, token: string) =>
    api.post<{ success: boolean }>(
      '/api/notifications/push/register',
      { token: expoToken },
      token
    ),

  /** Clear it on sign-out so a shared device stops receiving these. */
  unregisterPushToken: (token: string) =>
    api.post<{ success: boolean }>('/api/notifications/push/unregister', {}, token),

  /** Both the Expo and Web Push senders respect this flag. */
  setEnabled: (enabled: boolean, token: string) =>
    api.post<{ success: boolean; pushNotificationsEnabled: boolean }>(
      '/api/notifications/preferences',
      { enabled },
      token
    ),
};
