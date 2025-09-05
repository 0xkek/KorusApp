/**
 * Simple in-memory cache for frequently accessed data
 * In production, consider using Redis for distributed caching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Set cache data
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  /**
   * Delete cached data
   */
  delete(key: string): boolean {
    if (!key) return false;
    return this.cache.delete(key);
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create cache instances for different data types
export const userCache = new SimpleCache(500);      // Cache 500 users
export const postCache = new SimpleCache(1000);     // Cache 1000 posts
export const feedCache = new SimpleCache(100);      // Cache 100 feed pages

/**
 * Cache key generators
 */
export const cacheKeys = {
  user: (walletAddress: string) => `user:${walletAddress}`,
  post: (postId: string) => `post:${postId}`,
  feed: (page: number, category?: string) => `feed:${category || 'all'}:${page}`,
  userPosts: (walletAddress: string, page: number) => `userPosts:${walletAddress}:${page}`,
  trending: () => 'trending:posts',
  leaderboard: () => 'leaderboard:users',
};

/**
 * Cache decorator for async functions
 */
export function cached(ttl: number = 5 * 60 * 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
      
      // Check cache
      const cachedResult = postCache.get(cacheKey);
      if (cachedResult) {
        // logger.debug(`Cache hit: ${cacheKey}`);
        return cachedResult;
      }
      
      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache result
      postCache.set(cacheKey, result, ttl);
      // logger.debug(`Cached: ${cacheKey}`);
      
      return result;
    };
    
    return descriptor;
  };
}