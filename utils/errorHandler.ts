import { Alert } from 'react-native';
import { logger } from './logger';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

export class ApiError extends Error implements AppError {
  code?: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, statusCode?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error implements AppError {
  code = 'NETWORK_ERROR';
  
  constructor(message: string = 'Network connection error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Global error handler
export const handleError = (error: unknown, context?: string): void => {
  logger.error(`Error${context ? ` in ${context}` : ''}:`, error);

  let message = 'An unexpected error occurred';
  let title = 'Error';

  if (error instanceof ApiError) {
    message = error.message;
    title = 'Server Error';
  } else if (error instanceof NetworkError) {
    message = 'Please check your internet connection and try again';
    title = 'Connection Error';
  } else if (error instanceof ValidationError) {
    message = error.message;
    title = 'Invalid Input';
  } else if (error instanceof Error) {
    message = error.message;
  }

  Alert.alert(title, message);
};

// Async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  options?: {
    showAlert?: boolean;
    fallbackValue?: T;
    onError?: (error: unknown) => void;
  }
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Error in ${context || 'operation'}:`, error);
    
    if (options?.onError) {
      options.onError(error);
    }
    
    if (options?.showAlert !== false) {
      handleError(error, context);
    }
    
    return options?.fallbackValue;
  }
}

// Retry logic for network operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// Input validation helpers
export const validateInput = {
  wallet: (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  },
  
  postContent: (content: string): boolean => {
    return content.trim().length > 0 && content.length <= 500;
  },
  
  tipAmount: (amount: number): boolean => {
    return amount > 0 && amount <= 10000 && Number.isInteger(amount);
  },
  
  username: (username: string): boolean => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  },
  
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

// Safe JSON parsing
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    logger.error('JSON parse error:', error);
    return fallback;
  }
}