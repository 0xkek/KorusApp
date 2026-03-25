/**
 * Posts API Service
 * Handles all post-related API calls
 */

import { api } from './client';
import type { APIPostsResponse, APIPostResponse, CreatePostRequest } from '@/types/api';

// Re-export API types for convenience
export type { APIPostsResponse, APIPostResponse, CreatePostRequest };

export const postsAPI = {
  /**
   * Get all posts with optional filtering
   */
  async getPosts(params?: {
    category?: string;
    subcategory?: string;
    page?: number;
    limit?: number;
  }): Promise<APIPostsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.subcategory) searchParams.set('subcategory', params.subcategory);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return api.get<APIPostsResponse>(`/api/posts${query ? `?${query}` : ''}`);
  },

  /**
   * Get posts by a specific wallet address
   */
  async getUserPosts(walletAddress: string, params?: {
    limit?: number;
  }): Promise<APIPostsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('authorWallet', walletAddress);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return api.get<APIPostsResponse>(`/api/posts?${searchParams.toString()}`);
  },

  /**
   * Get a single post by ID
   */
  async getPost(id: number | string, token?: string): Promise<APIPostResponse> {
    return api.get<APIPostResponse>(`/api/posts/${id}`, token);
  },

  /**
   * Create a new post
   */
  async createPost(data: CreatePostRequest, token: string): Promise<APIPostResponse> {
    return api.post<APIPostResponse>('/api/posts', data, token);
  },

  /**
   * Delete a post
   */
  async deletePost(id: string | number, token: string): Promise<void> {
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
