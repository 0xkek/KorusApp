/**
 * Hybrid cache: in-memory L1 + optional Redis L2
 * Uses REDIS_URL env var to auto-connect to Redis when available.
 * Falls back to in-memory only when Redis is not configured.
 */

import { logger } from './logger';

let Redis: typeof import('ioredis').default | null = null;
let redisClient: InstanceType<typeof import('ioredis').default> | null = null;

// Lazy-init Redis connection
function getRedis() {
  if (redisClient) return redisClient;
  if (!process.env.REDIS_URL) return null;

  try {
    // Dynamic import so the app doesn't crash if ioredis isn't installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Redis = require('ioredis');
    if (!Redis) return null;

    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.connect().catch((err: Error) => {
      logger.error('Redis connection failed, falling back to in-memory cache:', err.message);
      redisClient = null;
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis error:', err.message);
    });

    redisClient.on('connect', () => {
      logger.info('Redis cache connected');
    });

    return redisClient;
  } catch {
    logger.warn('ioredis not available, using in-memory cache only');
    return null;
  }
}

// Initialize Redis on module load (non-blocking)
getRedis();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class HybridCache {
  private memory: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private prefix: string;

  constructor(prefix: string, maxSize: number = 1000) {
    this.memory = new Map();
    this.maxSize = maxSize;
    this.prefix = prefix;

    // Clean up expired in-memory entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached data (checks in-memory first, then Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.prefix}:${key}`;

    // L1: in-memory
    const entry = this.memory.get(fullKey);
    if (entry) {
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.memory.delete(fullKey);
      } else {
        return entry.data as T;
      }
    }

    // L2: Redis
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get(fullKey);
        if (raw) {
          const data = JSON.parse(raw) as T;
          // Backfill L1 (use remaining TTL from Redis, estimate 60s)
          this.memSet(fullKey, data, 60_000);
          return data;
        }
      } catch {
        // Redis read failed, fall through
      }
    }

    return null;
  }

  /**
   * Synchronous in-memory-only get (for hot-path compatibility)
   */
  getSync<T>(key: string): T | null {
    const fullKey = `${this.prefix}:${key}`;
    const entry = this.memory.get(fullKey);

    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.memory.delete(fullKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data in both in-memory and Redis
   */
  async set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    const fullKey = `${this.prefix}:${key}`;

    // L1: in-memory
    this.memSet(fullKey, data, ttl);

    // L2: Redis (fire-and-forget)
    const redis = getRedis();
    if (redis) {
      const ttlSeconds = Math.ceil(ttl / 1000);
      redis.set(fullKey, JSON.stringify(data), 'EX', ttlSeconds).catch(() => {});
    }
  }

  /**
   * Delete from both caches
   */
  async delete(key: string): Promise<boolean> {
    if (!key) return false;
    const fullKey = `${this.prefix}:${key}`;
    const deleted = this.memory.delete(fullKey);

    const redis = getRedis();
    if (redis) {
      redis.del(fullKey).catch(() => {});
    }

    return deleted;
  }

  /**
   * Clear entire cache (in-memory + Redis prefix)
   */
  async clear(): Promise<void> {
    this.memory.clear();

    const redis = getRedis();
    if (redis) {
      try {
        const keys = await redis.keys(`${this.prefix}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // ignore
      }
    }
  }

  private memSet(fullKey: string, data: any, ttl: number): void {
    if (this.memory.size >= this.maxSize) {
      const firstKey = this.memory.keys().next().value;
      if (firstKey) this.memory.delete(firstKey);
    }

    this.memory.set(fullKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memory.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.memory.delete(key));
  }

  getStats() {
    return {
      size: this.memory.size,
      maxSize: this.maxSize,
      prefix: this.prefix,
      redisConnected: !!getRedis()?.status && getRedis()?.status === 'ready',
      keys: Array.from(this.memory.keys()),
    };
  }
}

// Create cache instances for different data types
export const userCache = new HybridCache('user', 500);
export const postCache = new HybridCache('post', 1000);
export const feedCache = new HybridCache('feed', 100);

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

      const cachedResult = await postCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const result = await originalMethod.apply(this, args);

      await postCache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}
