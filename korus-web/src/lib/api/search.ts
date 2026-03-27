/**
 * Search API Service
 * Handles all search-related API calls
 */

import { api } from './client';

export interface SearchResults {
  success: boolean;
  posts: unknown[];
  users?: unknown[];
  totalPosts: number;
  hasMore: boolean;
}

export interface UserSearchResults {
  success: boolean;
  users: unknown[];
}

export const searchAPI = {
  /**
   * Search posts and users
   */
  async search(params: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResults> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', params.query);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());

    return api.get<SearchResults>(`/api/search?${searchParams.toString()}`);
  },

  /**
   * Search users only
   */
  async searchUsers(params: {
    query: string;
    limit?: number;
  }): Promise<UserSearchResults> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', params.query);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return api.get<UserSearchResults>(`/api/search/users?${searchParams.toString()}`);
  },

  /**
   * Search users for @mention autocomplete (lightweight)
   */
  async searchMentions(query: string, limit = 8): Promise<UserSearchResults> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', query);
    searchParams.set('limit', limit.toString());
    return api.get<UserSearchResults>(`/api/search/mentions?${searchParams.toString()}`);
  },
};
