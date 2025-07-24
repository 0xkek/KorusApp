import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// API base URL - use environment variable or default to Railway URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://korusapp-production.up.railway.app/api';

// Token storage key
const AUTH_TOKEN_KEY = 'korus_auth_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Add withCredentials for CORS
  withCredentials: false, // Set to false for cross-origin requests without cookies
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Skip auth header for GET requests to /posts
      const isPostsGet = config.method?.toLowerCase() === 'get' && config.url?.includes('/posts');
      
      if (!isPostsGet) {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        
        // Only add Authorization header if we have a valid token
        if (token && token !== 'null' && token !== 'undefined') {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      // Log the request for debugging
      logger.log('API Request:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        headers: config.headers,
        skippedAuth: isPostsGet,
      });
    } catch (error) {
      logger.error('Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    logger.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      logger.warn('401 Unauthorized - Token cleared');
      // TODO: Redirect to login or trigger re-authentication
    }
    
    // Log error details
    logger.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    
    return Promise.reject(error);
  }
);

// Auth functions
export const authAPI = {
  async connectWallet(walletAddress: string, signature: string, message: string) {
    const response = await api.post('/auth/connect', {
      walletAddress,
      signature,
      message,
    });
    
    // Store the token
    if (response.data.token) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.data.token);
    }
    
    return response.data;
  },
  
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  async logout() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};

// Posts API
export const postsAPI = {
  async getPosts(params?: { 
    topic?: string; 
    subtopic?: string; 
    limit?: number; 
    offset?: number;
  }) {
    const response = await api.get('/posts', { params });
    return response.data;
  },
  
  async getPost(id: string) {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },
  
  async createPost(data: {
    content: string;
    topic?: string;
    subtopic?: string;
    imageUrl?: string;
    videoUrl?: string;
  }) {
    const response = await api.post('/posts', data);
    return response.data;
  },
};

// Replies API
export const repliesAPI = {
  async createReply(postId: string, data: {
    content: string;
    parentReplyId?: string;
  }) {
    const response = await api.post(`/posts/${postId}/replies`, data);
    return response.data;
  },
  
  async getReplies(postId: string) {
    const response = await api.get(`/posts/${postId}/replies`);
    return response.data;
  },
  
  async likeReply(replyId: string) {
    const response = await api.post(`/replies/${replyId}/like`);
    return response.data;
  },
};

// Interactions API
export const interactionsAPI = {
  async likePost(postId: string) {
    const response = await api.post(`/interactions/posts/${postId}/like`);
    return response.data;
  },
  
  async tipPost(postId: string, amount: number) {
    const response = await api.post(`/interactions/posts/${postId}/tip`, { amount });
    return response.data;
  },
  
  async getPostInteractions(postId: string) {
    const response = await api.get(`/interactions/posts/${postId}`);
    return response.data;
  },
  
  async getUserInteractions(postIds: (string | number)[]) {
    const response = await api.post('/interactions/user', { 
      postIds: postIds.map(id => String(id)) 
    });
    return response.data;
  },
};

// Health check
export const healthAPI = {
  async check() {
    // Health endpoint is at root level, not under /api
    const response = await axios.get('https://korusapp-production.up.railway.app/health');
    return response.data;
  },
};

// Helper to check if we have a stored token
export async function hasAuthToken(): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    return !!token;
  } catch {
    return false;
  }
}

// Helper to get stored token
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export default api;