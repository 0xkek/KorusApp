import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Rate limiter for post creation - prevent duplicate posts
export const createPostLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1, // Limit each wallet to 1 post per 30 seconds
  message: 'Too many posts created. Please wait 30 seconds before posting again.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.debug(`Rate limit hit for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many posts created. Please wait 30 seconds before posting again.',
      retryAfter: 30
    });
  }
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased to 300 requests per 15 minutes (more lenient)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Temporarily increased for testing - Limit each IP to 20 auth requests per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for game endpoints
export const gameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 game requests per minute
  message: 'Too many game requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for search endpoints - LOOSE
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 search requests per minute
  message: 'Too many search requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for interaction endpoints (likes, tips)
export const interactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 interactions per minute
  message: 'Too many interactions, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for report endpoints
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 reports per hour
  message: 'Too many reports submitted, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for NFT endpoints - VERY LOOSE
export const nftLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 NFT requests per minute
  message: 'Too many NFT requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for SNS endpoints - VERY LOOSE
export const snsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 SNS requests per minute
  message: 'Too many SNS requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for sponsored content tracking - VERY LOOSE
export const sponsoredTrackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // Limit each IP to 500 tracking events per minute
  message: 'Too many tracking requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for username changes - LENIENT
export const usernameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Allow 10 username change attempts per minute
  message: 'Too many username change attempts, please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
});