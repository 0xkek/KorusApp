import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = undefined;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'APP_ERROR';
    
    if ((err as any).fields) {
      details = (err as any).fields;
    }
    
    // Log operational errors as warnings, others as errors
    if (err.isOperational) {
      logger.warn('Operational error:', {
        statusCode,
        message,
        code,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
    } else {
      logger.error('Non-operational error:', err);
    }
  } 
  // Handle Prisma errors that weren't caught
  else if ((err as any).code?.startsWith('P')) {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate entry found';
      code = 'DUPLICATE_ENTRY';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      code = 'NOT_FOUND';
    } else {
      statusCode = 500;
      message = 'Database error';
      code = 'DATABASE_ERROR';
    }
    
    logger.error('Prisma error:', prismaError);
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
    logger.warn('JWT error:', err.message);
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
    logger.warn('JWT expired:', err.message);
  }
  // Handle validation errors from express-validator
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = (err as any).errors;
    logger.warn('Validation error:', details);
  }
  // Handle unknown errors
  else {
    logger.error('Unexpected error:', err);
    
    // In production, don't leak error details
    if (process.env.NODE_ENV === 'production') {
      message = 'Something went wrong';
    } else {
      message = err.message || 'Internal server error';
    }
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message,
      statusCode
    }
  };

  // Include details if available
  if (details) {
    errorResponse.error.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Include request ID if available
  if ((req as any).id) {
    errorResponse.error.requestId = (req as any).id;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(err);
};