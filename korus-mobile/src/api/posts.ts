import { api } from './client';
import type { Post, PostsResponse, SinglePostResponse, TrendingResponse } from './types';

export const postsAPI = {
  /** Main feed. Cursor pagination — pass meta.nextCursor to page forward. */
  getPosts: (params: { limit?: number; cursor?: string } = {}) => {
    const q = new URLSearchParams();
    q.set('limit', String(params.limit ?? 20));
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<PostsResponse>(`/api/posts?${q.toString()}`);
  },

  /** Public — no auth required, which is what makes shared links work. */
  getPost: (id: string) => api.get<SinglePostResponse>(`/api/posts/${id}`),

  /**
   * A single user's posts. The param is `authorWallet` — `author` is silently
   * ignored by the backend and returns the unfiltered feed.
   */
  getUserPosts: (walletAddress: string, params: { limit?: number; cursor?: string } = {}) => {
    const q = new URLSearchParams();
    q.set('authorWallet', walletAddress);
    q.set('limit', String(params.limit ?? 20));
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<PostsResponse>(`/api/posts?${q.toString()}`);
  },

  /** Create a post. Auth required. */
  createPost: (data: { content: string; imageUrl?: string }, token: string) =>
    api.post<{ success: boolean; data?: Post; post?: Post }>('/api/posts', data, token),

  /** Reply to a post. Auth required. */
  createReply: (postId: string, content: string, token: string) =>
    api.post<{ success: boolean; reply?: unknown; data?: unknown }>(
      `/api/posts/${postId}/replies`,
      { content },
      token
    ),

  /**
   * Like is a toggle — the same POST likes and unlikes. The response's `liked`
   * field is the resulting state, so trust it rather than assuming the flip.
   */
  toggleLike: (postId: string, token: string) =>
    api.post<{ success: boolean; liked: boolean; message: string }>(
      `/api/interactions/posts/${postId}/like`,
      {},
      token
    ),

  /** Repost. Auth required. */
  repost: (postId: string, token: string) =>
    api.post<{ success: boolean }>(`/api/interactions/posts/${postId}/repost`, {}, token),

  /**
   * Which of these posts the signed-in user has already liked/tipped/reposted.
   * Without this the feed cannot render like state correctly on load.
   */
  getUserInteractions: (postIds: string[], token: string) =>
    api.post<{
      success: boolean;
      interactions: Record<string, { liked: boolean; tipped: boolean; reposted: boolean }>;
    }>('/api/interactions/user', { postIds }, token),

  /** Trending uses offset, not cursor. */
  getTrending: (params: { limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    q.set('limit', String(params.limit ?? 20));
    if (params.offset) q.set('offset', String(params.offset));
    return api.get<TrendingResponse>(`/api/posts/trending?${q.toString()}`);
  },
};
