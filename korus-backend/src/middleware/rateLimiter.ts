import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter for post creation - prevent duplicate posts
export const createPostLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1, // Limit each wallet to 1 post per 30 seconds
  message: 'Too many posts created. Please wait 30 seconds before posting again.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.log(`Rate limit hit for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many posts created. Please wait 30 seconds before posting again.',
      retryAfter: 30
    });
  }
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
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

// Rate limiter for search endpoints
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
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