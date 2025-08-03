import { ApiError, NetworkError, retryOperation } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiRequestOptions extends RequestInit {
  token?: string;
  retry?: boolean;
}

export class ApiService {
  private static token: string | null = null;

  static setAuthToken(token: string | null) {
    this.token = token;
  }

  private static async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { token = this.token, retry = true, ...fetchOptions } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const makeRequest = async () => {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        const data = await response.json();

        if (!response.ok) {
          // Log the error for debugging
          logger.error('API request failed:', {
            url: endpoint,
            status: response.status,
            statusText: response.statusText,
            data
          });
          
          throw new ApiError(
            data.message || data.error || 'Request failed',
            response.status,
            data.code,
            data.details
          );
        }

        return data;
      } catch (error) {
        if (error instanceof TypeError && error.message === 'Network request failed') {
          throw new NetworkError();
        }
        throw error;
      }
    };

    if (retry) {
      return retryOperation(makeRequest, 3, 1000);
    } else {
      return makeRequest();
    }
  }

  // Auth endpoints
  static auth = {
    login: async (walletAddress: string, signature: string) => {
      return ApiService.request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature }),
      });
    },

    register: async (walletAddress: string, signature: string, username?: string) => {
      return ApiService.request<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature, username }),
      });
    },

    verify: async () => {
      return ApiService.request<{ user: any }>('/auth/verify');
    },

    logout: async () => {
      return ApiService.request('/auth/logout', { method: 'POST' });
    },
  };

  // Posts endpoints
  static posts = {
    getAll: async (params?: {
      limit?: number;
      offset?: number;
      category?: string;
      subcategory?: string;
    }) => {
      const query = new URLSearchParams(params as any).toString();
      return ApiService.request<{ posts: any[]; total: number }>(
        `/posts${query ? `?${query}` : ''}`
      );
    },

    getById: async (id: string) => {
      return ApiService.request<{ post: any }>(`/posts/${id}`);
    },

    create: async (data: {
      content: string;
      category?: string;
      subcategory?: string;
      images?: string[];
    }) => {
      return ApiService.request<{ post: any }>('/posts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: { content?: string }) => {
      return ApiService.request<{ post: any }>(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      return ApiService.request(`/posts/${id}`, { method: 'DELETE' });
    },

    like: async (id: string) => {
      return ApiService.request(`/posts/${id}/like`, { method: 'POST' });
    },

    unlike: async (id: string) => {
      return ApiService.request(`/posts/${id}/unlike`, { method: 'POST' });
    },

    tip: async (id: string, amount: number) => {
      return ApiService.request(`/posts/${id}/tip`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
  };

  // Replies endpoints
  static replies = {
    create: async (postId: string, content: string) => {
      return ApiService.request<{ reply: any }>(`/posts/${postId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },

    like: async (postId: string, replyId: string) => {
      return ApiService.request(`/posts/${postId}/replies/${replyId}/like`, {
        method: 'POST',
      });
    },

    tip: async (postId: string, replyId: string, amount: number) => {
      return ApiService.request(`/posts/${postId}/replies/${replyId}/tip`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
  };

  // Users endpoints
  static users = {
    getProfile: async (walletAddress: string) => {
      return ApiService.request<{ user: any }>(`/users/${walletAddress}`);
    },

    updateProfile: async (data: {
      username?: string;
      bio?: string;
      avatar?: string;
      nftAvatar?: any;
    }) => {
      return ApiService.request<{ user: any }>('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getStats: async (walletAddress: string) => {
      return ApiService.request<{
        postsCount: number;
        repliesCount: number;
        likesReceived: number;
        tipsReceived: number;
      }>(`/users/${walletAddress}/stats`);
    },
  };

  // Notifications endpoints
  static notifications = {
    getAll: async (unreadOnly = false) => {
      return ApiService.request<{ notifications: any[] }>(
        `/notifications${unreadOnly ? '?unread=true' : ''}`
      );
    },

    markAsRead: async (id: string) => {
      return ApiService.request(`/notifications/${id}/read`, { method: 'POST' });
    },

    markAllAsRead: async () => {
      return ApiService.request('/notifications/read-all', { method: 'POST' });
    },
  };

  // Games endpoints
  static games = {
    createRoom: async (gameType: string, bet: number) => {
      return ApiService.request<{ roomId: string }>('/games/rooms', {
        method: 'POST',
        body: JSON.stringify({ gameType, bet }),
      });
    },

    joinRoom: async (roomId: string) => {
      return ApiService.request(`/games/rooms/${roomId}/join`, { method: 'POST' });
    },

    makeMove: async (roomId: string, move: any) => {
      return ApiService.request(`/games/rooms/${roomId}/move`, {
        method: 'POST',
        body: JSON.stringify({ move }),
      });
    },

    getRoom: async (roomId: string) => {
      return ApiService.request<{ room: any }>(`/games/rooms/${roomId}`);
    },
  };

  // Events endpoints
  static events = {
    getAll: async () => {
      return ApiService.request<{ events: any[] }>('/events');
    },

    getById: async (id: string) => {
      return ApiService.request<{ event: any }>(`/events/${id}`);
    },

    register: async (id: string) => {
      return ApiService.request(`/events/${id}/register`, { method: 'POST' });
    },
  };
}

export default ApiService;