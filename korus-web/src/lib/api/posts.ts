/**
 * Posts API Service
 * Handles all post-related API calls
 */

import { api } from './client';

export interface Post {
  id: number;
  walletAddress: string;
  content: string;
  category: string;
  subcategory: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  likes?: number;
  repliesCount?: number;
  isLiked?: boolean;
  user?: {
    walletAddress: string;
    username?: string;
    displayName?: string;
    nftAvatar?: string;
  };
}

export interface CreatePostData {
  content: string;
  topic: string;
  subtopic: string;
  imageUrl?: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}

export const postsAPI = {
  /**
   * Get all posts with optional filtering
   */
  async getPosts(params?: {
    category?: string;
    subcategory?: string;
    page?: number;
    limit?: number;
  }): Promise<PostsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.subcategory) searchParams.set('subcategory', params.subcategory);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return api.get<PostsResponse>(`/api/posts${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single post by ID
   */
  async getPost(id: number, token?: string): Promise<Post> {
    return api.get<Post>(`/api/posts/${id}`, token);
  },

  /**
   * Create a new post
   */
  async createPost(data: CreatePostData, token: string): Promise<Post> {
    return api.post<Post>('/api/posts', data, token);
  },

  /**
   * Delete a post
   */
  async deletePost(id: number, token: string): Promise<void> {
    return api.delete(`/api/posts/${id}`, token);
  },

  /**
   * Like a post
   */
  async likePost(id: number, token: string): Promise<{ message: string }> {
    return api.post(`/api/interactions/like`, { postId: id }, token);
  },

  /**
   * Unlike a post
   */
  async unlikePost(id: number, token: string): Promise<{ message: string }> {
    return api.delete(`/api/interactions/like/${id}`, token);
  },
};
