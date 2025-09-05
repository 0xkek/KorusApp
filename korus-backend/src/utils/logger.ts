import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Log levels
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Current log level based on environment
const currentLogLevel = isProduction ? LogLevel.WARN : LogLevel.DEBUG;

/**
 * Format log message with metadata
 */
function formatLogMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const baseLog = {
    timestamp,
    level,
    message,
    ...(meta && { metadata: meta }),
  };

  // In production, use JSON format for better parsing
  if (isProduction) {
    return JSON.stringify(baseLog);
  }

  // In development, use colored human-readable format
  let color = colors.reset;
  switch (level) {
    case 'ERROR':
      color = colors.red;
      break;
    case 'WARN':
      color = colors.yellow;
      break;
    case 'INFO':
      color = colors.blue;
      break;
    case 'DEBUG':
      color = colors.cyan;
      break;
  }

  let output = `${color}[${timestamp}] [${level}]${colors.reset} ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    output += ` ${colors.magenta}${JSON.stringify(meta, null, 2)}${colors.reset}`;
  }
  return output;
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;
  
  // Deep clone to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  const sensitiveKeys = [
    'password',
    'token',
    'jwt',
    'authorization',
    'api_key',
    'apiKey',
    'secret',
    'privateKey',
    'private_key',
    'signature',
  ];
  
  function sanitizeObject(obj: any) {
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  
  if (typeof sanitized === 'object') {
    sanitizeObject(sanitized);
  }
  
  return sanitized;
}

/**
 * Extract request metadata for logging
 */
export function getRequestMeta(req: Request) {
  return {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: (req as any).id,
    userWallet: (req as any).userWallet,
  };
}

/**
 * Structured logger with different log levels
 */
export const logger = {
  error: (message: string, error?: Error | any, meta?: any) => {
    if (currentLogLevel >= LogLevel.ERROR) {
      const errorMeta = {
        ...sanitizeData(meta),
        ...(error && {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: isProduction ? undefined : error.stack,
          errorCode: error.code,
        }),
      };
      console.error(formatLogMessage('ERROR', message, errorMeta));
    }
  },

  warn: (message: string, meta?: any) => {
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(formatLogMessage('WARN', message, sanitizeData(meta)));
    }
  },

  info: (message: string, meta?: any) => {
    if (currentLogLevel >= LogLevel.INFO) {
      console.info(formatLogMessage('INFO', message, sanitizeData(meta)));
    }
  },

  debug: (message: string, meta?: any) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.log(formatLogMessage('DEBUG', message, sanitizeData(meta)));
    }
  },

  // Specialized loggers
  request: (req: Request, meta?: any) => {
    if (currentLogLevel >= LogLevel.INFO) {
      const requestMeta = {
        ...getRequestMeta(req),
        ...sanitizeData(meta),
      };
      console.info(formatLogMessage('INFO', 'Incoming request', requestMeta));
    }
  },

  response: (req: Request, statusCode: number, responseTime: number, meta?: any) => {
    if (currentLogLevel >= LogLevel.INFO) {
      const responseMeta = {
        ...getRequestMeta(req),
        statusCode,
        responseTime: `${responseTime}ms`,
        ...sanitizeData(meta),
      };
      const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
      const message = `Response sent - ${statusCode}`;
      
      if (level === 'ERROR') {
        console.error(formatLogMessage(level, message, responseMeta));
      } else if (level === 'WARN') {
        console.warn(formatLogMessage(level, message, responseMeta));
      } else {
        console.info(formatLogMessage(level, message, responseMeta));
      }
    }
  },

  // Legacy compatibility
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
};