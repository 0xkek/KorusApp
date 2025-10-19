/**
 * Development-only logger utility
 * Automatically strips console statements in production builds
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      logger.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isDevelopment) {
      logger.error(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      logger.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};
