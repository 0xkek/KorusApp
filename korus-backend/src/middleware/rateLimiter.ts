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