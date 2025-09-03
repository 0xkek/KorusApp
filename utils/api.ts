import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';
import { offlineManager } from './offlineManager';

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
      
      // Add CSRF token for state-changing requests
      if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        const sessionId = await SecureStore.getItemAsync('korus_session_id');
        const csrfToken = await SecureStore.getItemAsync('korus_csrf_token');
        
        if (!sessionId) {
          // Generate new session ID
          const newSessionId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
          await SecureStore.setItemAsync('korus_session_id', newSessionId);
          config.headers['X-Session-Id'] = newSessionId;
          
          // Request new CSRF token from backend
          try {
            const csrfResponse = await axios.get(`${API_BASE_URL}/auth/csrf`, {
              headers: { 'X-Session-Id': newSessionId }
            });
            if (csrfResponse.data.token) {
              await SecureStore.setItemAsync('korus_csrf_token', csrfResponse.data.token);
              config.headers['X-CSRF-Token'] = csrfResponse.data.token;
            }
          } catch (error) {
            logger.warn('Failed to get CSRF token:', error);
          }
        } else {
          config.headers['X-Session-Id'] = sessionId;
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }
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
    
    // Log error details with proper stringification of nested objects
    const errorData = error.response?.data;
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: errorData,
      message: error.message,
      retryCount: config?.headers?.['X-Retry-Count'] || '0',
    };
    
    // If there are validation details, log them separately for clarity
    if (errorData?.details && Array.isArray(errorData.details)) {
      logger.error('Validation Error Details:', errorData.details.map((d: any) => 
        typeof d === 'object' ? JSON.stringify(d) : d
      ));
    }
    
    logger.error('API Error:', errorDetails);
    
    return Promise.reject(error);
  }
);

// Auth functions
export const authAPI = {
  async connectWallet(walletAddress: string, signature: string, message: string) {
    // Authentication must be online
    if (!offlineManager.getIsOnline()) {
      throw new Error('Authentication requires an internet connection');
    }
    
    const response = await api.post('/auth/connect', {
      walletAddress,
      signature,
      message,
    });
    
    // Store the token
    if (response.data.token) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.data.token);
      await SecureStore.setItemAsync('korus_wallet_address', walletAddress);
      // Cache user profile
      await offlineManager.setCached('user_profile', response.data.user, 30 * 60 * 1000);
    }
    
    return response.data;
  },
  
  async getProfile() {
    const cacheKey = 'user_profile';
    
    // Check cache first
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return { user: cached };
    }
    
    try {
      const response = await api.get('/auth/profile');
      // Cache profile for 30 minutes
      await offlineManager.setCached(cacheKey, response.data.user, 30 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return { user: cached };
      }
      throw error;
    }
  },
  
  async updateProfile(data: { 
    snsUsername?: string | null; 
    nftAvatar?: string | null;
    displayName?: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    twitter?: string | null;
    themeColor?: string | null;
  }) {
    // Queue profile updates if offline
    if (!offlineManager.getIsOnline()) {
      await offlineManager.queueRequest({
        method: 'PUT',
        url: '/auth/profile',
        data
      });
      // Update local cache optimistically
      const cached = await offlineManager.getCached('user_profile');
      if (cached) {
        const updated = { ...cached, ...data };
        await offlineManager.setCached('user_profile', updated, 30 * 60 * 1000);
      }
      return { queued: true, message: 'Profile will update when online', user: { ...cached, ...data } };
    }
    
    try {
      const response = await api.put('/auth/profile', data);
      // Update cache
      await offlineManager.setCached('user_profile', response.data.user, 30 * 60 * 1000);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || !navigator.onLine) {
        await offlineManager.queueRequest({
          method: 'PUT',
          url: '/auth/profile',
          data
        });
        const cached = await offlineManager.getCached('user_profile');
        const updated = { ...cached, ...data };
        await offlineManager.setCached('user_profile', updated, 30 * 60 * 1000);
        return { queued: true, message: 'Profile will update when online', user: updated };
      }
      throw error;
    }
  },
  
  async logout() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync('korus_wallet_address');
    // Clear all cached data
    await offlineManager.clearCache();
  },
};

// Posts API
export const postsAPI = {
  async getPosts(params?: { 
    topic?: string; 
    subtopic?: string; 
    limit?: number; 
    offset?: number;
    cursor?: string;
  }) {
    const cacheKey = `posts_${JSON.stringify(params || {})}`;
    
    // Check cache first if offline or for quick load
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.get('/posts', { params });
      
      // Cache the successful response
      await offlineManager.setCached(cacheKey, response.data, 5 * 60 * 1000); // 5 min cache
      
      return response.data;
    } catch (error) {
      // If offline and have cache, return it
      if (cached && !offlineManager.getIsOnline()) {
        return cached;
      }
      throw error;
    }
  },
  
  async getPost(id: string) {
    const cacheKey = `post_${id}`;
    
    // Check cache first
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.get(`/posts/${id}`);
      // Cache individual post for 10 minutes
      await offlineManager.setCached(cacheKey, response.data, 10 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  },
  
  async createPost(data: {
    content: string;
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
    
    // If offline, queue the request
    if (!offlineManager.getIsOnline()) {
      await offlineManager.queueRequest({
        method: 'POST',
        url: '/posts',
        data
      });
      return { queued: true, message: 'Post will be created when online' };
    }
    
    // Create the promise and store it
    const promise = api.post('/posts', data)
      .then(response => {
        pendingRequests.delete(requestKey);
        // Invalidate posts cache after creating new post
        offlineManager.invalidateCache('posts_');
        return response.data;
      })
      .catch(error => {
        pendingRequests.delete(requestKey);
        // Queue for retry if network error
        if (error.code === 'ECONNABORTED' || !navigator.onLine) {
          offlineManager.queueRequest({
            method: 'POST',
            url: '/posts',
            data
          });
        }
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
    // If offline, queue the request
    if (!offlineManager.getIsOnline()) {
      await offlineManager.queueRequest({
        method: 'POST',
        url: `/posts/${postId}/replies`,
        data
      });
      return { queued: true, message: 'Reply will be posted when online' };
    }
    
    try {
      const response = await api.post(`/posts/${postId}/replies`, data);
      // Invalidate replies cache for this post
      offlineManager.invalidateCache(`replies_${postId}`);
      return response.data;
    } catch (error: any) {
      // Queue for retry if network error
      if (error.code === 'ECONNABORTED' || !navigator.onLine) {
        await offlineManager.queueRequest({
          method: 'POST',
          url: `/posts/${postId}/replies`,
          data
        });
        return { queued: true, message: 'Reply will be posted when online' };
      }
      throw error;
    }
  },
  
  async getReplies(postId: string) {
    const cacheKey = `replies_${postId}`;
    
    // Check cache first
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.get(`/posts/${postId}/replies`);
      // Cache replies for 5 minutes
      await offlineManager.setCached(cacheKey, response.data, 5 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  },
  
  async likeReply(replyId: string) {
    // Optimistic update for offline
    if (!offlineManager.getIsOnline()) {
      await offlineManager.queueRequest({
        method: 'POST',
        url: `/replies/${replyId}/like`,
        data: {}
      });
      return { queued: true, liked: true, message: 'Like will sync when online' };
    }
    
    try {
      const response = await api.post(`/replies/${replyId}/like`);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || !navigator.onLine) {
        await offlineManager.queueRequest({
          method: 'POST',
          url: `/replies/${replyId}/like`,
          data: {}
        });
        return { queued: true, liked: true, message: 'Like will sync when online' };
      }
      throw error;
    }
  },
};

// Interactions API
export const interactionsAPI = {
  async likePost(postId: string) {
    // Optimistic update for offline
    if (!offlineManager.getIsOnline()) {
      await offlineManager.queueRequest({
        method: 'POST',
        url: `/interactions/posts/${postId}/like`,
        data: {}
      });
      return { queued: true, liked: true, message: 'Like will sync when online' };
    }
    
    try {
      const response = await api.post(`/interactions/posts/${postId}/like`);
      // Invalidate interactions cache
      offlineManager.invalidateCache(`interactions_${postId}`);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || !navigator.onLine) {
        await offlineManager.queueRequest({
          method: 'POST',
          url: `/interactions/posts/${postId}/like`,
          data: {}
        });
        return { queued: true, liked: true, message: 'Like will sync when online' };
      }
      throw error;
    }
  },
  
  async tipPost(postId: string, amount: number) {
    // Tips require online connection (blockchain transaction)
    if (!offlineManager.getIsOnline()) {
      throw new Error('Tips require an internet connection');
    }
    
    const response = await api.post(`/interactions/posts/${postId}/tip`, { amount });
    // Invalidate interactions cache
    offlineManager.invalidateCache(`interactions_${postId}`);
    return response.data;
  },
  
  async getPostInteractions(postId: string) {
    const cacheKey = `interactions_${postId}`;
    
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.get(`/interactions/posts/${postId}`);
      await offlineManager.setCached(cacheKey, response.data, 5 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  },
  
  async getUserInteractions(postIds: (string | number)[]) {
    const cacheKey = `user_interactions_${postIds.join(',')}`;
    
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.post('/interactions/user', { 
        postIds: postIds.map(id => String(id)) 
      });
      await offlineManager.setCached(cacheKey, response.data, 2 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
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
    const cacheKey = `search_${query}_${limit}_${offset}`;
    
    // Check cache for recent searches
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.get('/search', {
        params: { query, limit, offset },
        signal
      });
      // Cache search results for 2 minutes
      await offlineManager.setCached(cacheKey, response.data, 2 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  },
  
  async searchUsers(query: string, limit: number = 10) {
    const cacheKey = `search_users_${query}_${limit}`;
    
    const cached = await offlineManager.getCached(cacheKey);
    if (cached && !offlineManager.getIsOnline()) {
      return cached;
    }
    
    try {
      const response = await api.get('/search/users', {
        params: { query, limit }
      });
      // Cache user search for 5 minutes
      await offlineManager.setCached(cacheKey, response.data, 5 * 60 * 1000);
      return response.data;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  },
};

// Sponsored API
export const sponsoredAPI = {
  async getSponsoredPosts() {
    const response = await api.get('/sponsored');
    return response.data;
  },
  
  async createSponsoredPost(postId: string, data: {
    campaignName: string;
    durationDays: number;
    targetViews: number;
    pricePaid: number;
  }) {
    const response = await api.post('/sponsored/create', { postId, ...data });
    return response.data;
  },
  
  async trackView(postId: string) {
    const response = await api.post(`/sponsored/${postId}/view`);
    return response.data;
  },
  
  async trackClick(postId: string) {
    const response = await api.post(`/sponsored/${postId}/click`);
    return response.data;
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