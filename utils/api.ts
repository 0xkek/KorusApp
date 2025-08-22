import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// API base URL - use environment variable or default to Render URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://korus-backend.onrender.com/api';
logger.log('API Base URL:', API_BASE_URL);

// Hackathon mode flag
const HACKATHON_MODE = false;

// Token storage key
const AUTH_TOKEN_KEY = 'korus_auth_token';

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

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

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Helper to determine if request should be retried
const shouldRetry = (error: AxiosError) => {
  // Don't retry client errors (4xx) except for 429 (rate limit)
  if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
    return error.response.status === 429;
  }
  // Retry network errors and 5xx errors
  return !error.response || error.response.status >= 500;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Skip auth header for public endpoints
      const isPublicEndpoint = 
        (config.method?.toLowerCase() === 'get' && config.url?.includes('/posts')) ||
        config.url?.includes('/auth/connect') ||
        config.url?.includes('/health');
      
      if (!isPublicEndpoint) {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        
        logger.info('Auth interceptor:', {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          tokenLength: token?.length
        });
        
        // Only add Authorization header if we have a valid token
        if (token && token !== 'null' && token !== 'undefined') {
          config.headers.Authorization = `Bearer ${token}`;
          logger.info('Added auth header');
        } else {
          logger.warn('No valid token found for request');
        }
      }
      
      // Add retry count to config
      if (!config.headers['X-Retry-Count']) {
        config.headers['X-Retry-Count'] = '0';
      }
      
      // Log the request for debugging (commented out to reduce noise)
      // logger.log('API Request:', {
      //   url: config.url,
      //   method: config.method,
      //   baseURL: config.baseURL,
      //   headers: config.headers,
      //   skippedAuth: isPostsGet,
      // });
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

// Response interceptor for error handling and retries
api.interceptors.response.use(
  (response) => {
    // Log successful responses (commented out to reduce noise)
    // logger.log('API Response:', {
    //   url: response.config.url,
    //   status: response.status,
    //   data: response.data,
    // });
    return response;
  },
  async (error: AxiosError) => {
    // Log detailed error info
    logger.error('Axios error details:', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
    });
    
    const config = error.config;
    
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      logger.warn('401 Unauthorized - Token cleared');
      // TODO: Redirect to login or trigger re-authentication
    }
    
    // Retry logic
    if (config && shouldRetry(error)) {
      const retryCount = parseInt(config.headers['X-Retry-Count'] as string || '0');
      
      if (retryCount < MAX_RETRIES) {
        config.headers['X-Retry-Count'] = String(retryCount + 1);
        
        // Calculate delay with exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        
        logger.warn(`Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms:`, {
          url: config.url,
          method: config.method,
          status: error.response?.status,
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return api.request(config);
      }
    }
    
    // Log error details
    logger.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      retryCount: config?.headers?.['X-Retry-Count'] || '0',
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
      await SecureStore.setItemAsync('korus_wallet_address', walletAddress);
    }
    
    return response.data;
  },
  
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  async updateProfile(data: { snsUsername?: string | null; nftAvatar?: string | null }) {
    const response = await api.put('/auth/profile', data);
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
    // Twitter-style deduplication: prevent duplicate posts
    const requestKey = `createPost:${data.content}:${Date.now()}`;
    
    // Check if identical request is already pending
    if (pendingRequests.has(requestKey)) {
      logger.warn('Duplicate post request detected, returning existing promise');
      return pendingRequests.get(requestKey);
    }
    
    // Create the promise and store it
    const promise = api.post('/posts', data)
      .then(response => {
        pendingRequests.delete(requestKey);
        return response.data;
      })
      .catch(error => {
        pendingRequests.delete(requestKey);
        throw error;
      });
    
    pendingRequests.set(requestKey, promise);
    
    // Auto-cleanup after 5 seconds
    setTimeout(() => {
      pendingRequests.delete(requestKey);
    }, 5000);
    
    return promise;
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

// Games API
export const gamesAPI = {
  async createGame(data: {
    postId: string;
    gameType: string;
    wager: number;
  }) {
    const response = await api.post('/games', data);
    return response.data;
  },
  
  async joinGame(gameId: string) {
    const response = await api.post(`/games/${gameId}/join`);
    return response.data;
  },
  
  async makeMove(gameId: string, move: any) {
    const response = await api.post(`/games/${gameId}/move`, { move });
    return response.data;
  },
  
  async getGame(gameId: string) {
    const response = await api.get(`/games/${gameId}`);
    return response.data;
  },
  
  async getGameByPostId(postId: string) {
    const response = await api.get(`/games/post/${postId}`);
    return response.data;
  },
};

// Search API
export const searchAPI = {
  async search(query: string, limit: number = 20, offset: number = 0, signal?: AbortSignal) {
    const response = await api.get('/search', {
      params: { query, limit, offset },
      signal
    });
    return response.data;
  },
  
  async searchUsers(query: string, limit: number = 10) {
    const response = await api.get('/search/users', {
      params: { query, limit }
    });
    return response.data;
  },
};

// Health check
export const sponsoredAPI = {
  async getSponsoredPosts() {
    return makeRequest('get', '/sponsored');
  },
  
  async createSponsoredPost(postId: string, data: {
    campaignName: string;
    durationDays: number;
    targetViews: number;
    pricePaid: number;
  }) {
    return makeRequest('post', '/sponsored/create', { postId, ...data });
  },
  
  async trackView(postId: string) {
    return makeRequest('post', `/sponsored/${postId}/view`);
  },
  
  async trackClick(postId: string) {
    return makeRequest('post', `/sponsored/${postId}/click`);
  }
};

export const healthAPI = {
  async check() {
    // Health endpoint is at root level, not under /api
    const response = await axios.get('https://korus-backend.onrender.com/health');
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