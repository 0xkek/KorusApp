import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to log all incoming requests and outgoing responses
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.request(req, {
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.response(req, res.statusCode, responseTime);
    
    // Call original end function
    return originalEnd.call(res, chunk, encoding, cb);
  } as any;
  
  next();
};

/**
 * Middleware to log slow requests (performance monitoring)
 */
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const responseTime = Date.now() - startTime;
      
      if (responseTime > threshold) {
        logger.warn(`Slow request detected: ${req.method} ${req.path}`, {
          responseTime: `${responseTime}ms`,
          threshold: `${threshold}ms`,
          method: req.method,
          path: req.path,
          userWallet: (req as any).userWallet,
        });
      }
      
      return originalEnd.call(res, chunk, encoding, cb);
    } as any;
    
    next();
  };
};

/**
 * Middleware to log API errors with context
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error occurred', err, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userWallet: (req as any).userWallet,
    body: req.body,
    query: req.query,
  });
  
  next(err);
};