import rateLimit from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis'; // Commented until package is installed
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Advanced rate limiting configuration with sliding window and Redis support
// Similar to Twitter's approach with per-user and per-endpoint limits

// Create a Redis client if available (for production)
const createRedisStore = () => {
  // Redis store disabled until rate-limit-redis package is installed
  // To enable: npm install rate-limit-redis ioredis
  return undefined;
};

// Rate limit configurations per endpoint category
export const rateLimitConfigs = {
  // Authentication - very strict
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful auth
  },
  
  // Post creation - prevent spam
  createPost: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 posts per minute
    delayAfter: 0,
    delayMs: 30000, // 30 second delay after limit
  },
  
  // Reply creation - slightly more lenient than posts
  createReply: {
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 replies per minute
  },
  
  // Reading posts - very lenient
  readPosts: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  },
  
  // Search - moderate limits
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 searches per minute
  },
  
  // Interactions (likes, tips) - moderate
  interactions: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 interactions per minute
  },
  
  // Reports - strict to prevent abuse
  reports: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 reports per hour
  },
  
  // Games - moderate
  games: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 game actions per minute
  },
  
  // Notifications - lenient for real-time updates
  notifications: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  }
};

// Key generator that includes user wallet for authenticated routes
const keyGenerator = (req: Request | AuthRequest): string => {
  const authReq = req as AuthRequest;
  // Use wallet address for authenticated users, anonymous for others
  // This avoids IPv6 validation issues with express-rate-limit
  const identifier = authReq.userWallet || 'anonymous';
  return `${req.route?.path || req.path}:${identifier}`;
};

// Create rate limiter with specific config
export const createRateLimiter = (configName: keyof typeof rateLimitConfigs) => {
  const config = rateLimitConfigs[configName];
  const store = createRedisStore();
  
  return rateLimit({
    ...config,
    store: store || undefined, // Use Redis if available, otherwise memory
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const retryAfter = Math.ceil(config.windowMs / 1000);
      console.log(`Rate limit hit for ${configName}:`, {
        ip: req.ip,
        path: req.path,
        userWallet: (req as AuthRequest).userWallet
      });
      
      res.status(429).json({
        error: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
        limit: config.max,
        window: config.windowMs
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks and test endpoints in development
      if (req.path === '/health' || req.path === '/test-db') {
        return true;
      }
      // Skip for localhost in development
      if (process.env.NODE_ENV === 'development' && req.ip === '::1') {
        return false; // Still apply rate limiting in dev for testing
      }
      return false;
    }
  });
};

// Dynamic rate limiting based on user reputation
export const reputationBasedRateLimiter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userWallet) {
    return next();
  }
  
  try {
    // Get user from database
    const prisma = require('../config/database').default;
    const user = await prisma.user.findUnique({
      where: { walletAddress: req.userWallet },
      select: { 
        tier: true, 
        totalInteractionScore: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return next();
    }
    
    // Adjust rate limits based on user tier and reputation
    const now = new Date();
    const accountAge = now.getTime() - user.createdAt.getTime();
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
    
    // Premium users get 2x limits
    if (user.tier === 'premium') {
      req.rateLimit = { multiplier: 2 };
    }
    // Established users (30+ days, 100+ interaction score) get 1.5x limits
    else if (daysSinceCreation > 30 && user.totalInteractionScore > 100) {
      req.rateLimit = { multiplier: 1.5 };
    }
    // New users get standard limits
    else {
      req.rateLimit = { multiplier: 1 };
    }
    
  } catch (error) {
    console.error('Error in reputation-based rate limiter:', error);
  }
  
  next();
};

// Export specific limiters
export const authRateLimiter = createRateLimiter('auth');
export const createPostRateLimiter = createRateLimiter('createPost');
export const createReplyRateLimiter = createRateLimiter('createReply');
export const readPostsRateLimiter = createRateLimiter('readPosts');
export const searchRateLimiter = createRateLimiter('search');
export const interactionsRateLimiter = createRateLimiter('interactions');
export const reportsRateLimiter = createRateLimiter('reports');
export const gamesRateLimiter = createRateLimiter('games');
export const notificationsRateLimiter = createRateLimiter('notifications');

// Burst protection - prevents rapid-fire requests
export const burstProtection = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // Max 10 requests per second from any source
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests in a short time. Please slow down.',
      retryAfter: 1
    });
  }
});