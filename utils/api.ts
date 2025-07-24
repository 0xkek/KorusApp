import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// API base URL - use environment variable or default to Railway URL
// Replace this with your actual Railway URL when you get it
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-app.railway.app/api';

// Token storage key
const AUTH_TOKEN_KEY = 'korus_auth_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.error('Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      // TODO: Redirect to login or trigger re-authentication
    }
    
    // Log error details
    logger.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
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
  
  async bumpPost(id: string) {
    const response = await api.put(`/posts/${id}/bump`);
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
};

// Health check
export const healthAPI = {
  async check() {
    // Health endpoint is at root level, not under /api
    const response = await axios.get('http://10.157.43.59:3000/health');
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