import { api } from './client';
import type { PostsResponse, SinglePostResponse, TrendingResponse } from './types';

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

  /** Trending uses offset, not cursor. */
  getTrending: (params: { limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    q.set('limit', String(params.limit ?? 20));
    if (params.offset) q.set('offset', String(params.offset));
    return api.get<TrendingResponse>(`/api/posts/trending?${q.toString()}`);
  },
};
