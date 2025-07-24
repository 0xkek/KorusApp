import { Alert } from 'react-native';
import {
  ApiError,
  NetworkError,
  ValidationError,
  handleError,
  withErrorHandling,
  retryOperation,
  validateInput,
  safeJsonParse,
} from '../errorHandler';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classes', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Test error', 404, 'NOT_FOUND', { id: 123 });
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ id: 123 });
      expect(error.name).toBe('ApiError');
    });

    it('should create NetworkError with default message', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network connection error');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should create ValidationError with details', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('handleError', () => {
    it('should show alert for ApiError', () => {
      const error = new ApiError('Server error', 500);
      handleError(error);
      
      expect(Alert.alert).toHaveBeenCalledWith('Server Error', 'Server error');
    });

    it('should show alert for NetworkError', () => {
      const error = new NetworkError();
      handleError(error);
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Error',
        'Please check your internet connection and try again'
      );
    });

    it('should show alert for ValidationError', () => {
      const error = new ValidationError('Invalid email');
      handleError(error);
      
      expect(Alert.alert).toHaveBeenCalledWith('Invalid Input', 'Invalid email');
    });

    it('should show generic alert for unknown errors', () => {
      const error = new Error('Unknown error');
      handleError(error);
      
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unknown error');
    });

    it('should include context in error log', () => {
      const { logger } = require('../logger');
      const error = new Error('Test error');
      handleError(error, 'TestContext');
      
      expect(logger.error).toHaveBeenCalledWith('Error in TestContext:', error);
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withErrorHandling(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should handle errors and return fallback value', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const result = await withErrorHandling(operation, 'test', {
        fallbackValue: 'fallback',
        showAlert: false,
      });
      
      expect(result).toBe('fallback');
    });

    it('should call onError callback', async () => {
      const error = new Error('Failed');
      const operation = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();
      
      await withErrorHandling(operation, 'test', {
        onError,
        showAlert: false,
      });
      
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should show alert by default', async () => {
      const error = new Error('Failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await withErrorHandling(operation, 'test');
      
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await retryOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValue('success');
      
      const result = await retryOperation(operation, 3, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const error = new Error('Failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryOperation(operation, 2, 10)).rejects.toThrow('Failed');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateInput', () => {
    describe('wallet validation', () => {
      it('should validate correct wallet addresses', () => {
        expect(validateInput.wallet('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')).toBe(true);
        expect(validateInput.wallet('11111111111111111111111111111111')).toBe(true);
      });

      it('should reject invalid wallet addresses', () => {
        expect(validateInput.wallet('')).toBe(false);
        expect(validateInput.wallet('invalid')).toBe(false);
        expect(validateInput.wallet('0x1234567890abcdef')).toBe(false);
      });
    });

    describe('postContent validation', () => {
      it('should validate correct post content', () => {
        expect(validateInput.postContent('Hello world')).toBe(true);
        expect(validateInput.postContent('A'.repeat(500))).toBe(true);
      });

      it('should reject invalid post content', () => {
        expect(validateInput.postContent('')).toBe(false);
        expect(validateInput.postContent('   ')).toBe(false);
        expect(validateInput.postContent('A'.repeat(501))).toBe(false);
      });
    });

    describe('tipAmount validation', () => {
      it('should validate correct tip amounts', () => {
        expect(validateInput.tipAmount(1)).toBe(true);
        expect(validateInput.tipAmount(100)).toBe(true);
        expect(validateInput.tipAmount(10000)).toBe(true);
      });

      it('should reject invalid tip amounts', () => {
        expect(validateInput.tipAmount(0)).toBe(false);
        expect(validateInput.tipAmount(-1)).toBe(false);
        expect(validateInput.tipAmount(10001)).toBe(false);
        expect(validateInput.tipAmount(1.5)).toBe(false);
      });
    });

    describe('username validation', () => {
      it('should validate correct usernames', () => {
        expect(validateInput.username('user123')).toBe(true);
        expect(validateInput.username('test_user')).toBe(true);
        expect(validateInput.username('ABC')).toBe(true);
      });

      it('should reject invalid usernames', () => {
        expect(validateInput.username('ab')).toBe(false);
        expect(validateInput.username('user-name')).toBe(false);
        expect(validateInput.username('user name')).toBe(false);
        expect(validateInput.username('a'.repeat(21))).toBe(false);
      });
    });

    describe('email validation', () => {
      it('should validate correct emails', () => {
        expect(validateInput.email('test@example.com')).toBe(true);
        expect(validateInput.email('user+tag@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(validateInput.email('invalid')).toBe(false);
        expect(validateInput.email('@example.com')).toBe(false);
        expect(validateInput.email('test@')).toBe(false);
        expect(validateInput.email('test@.com')).toBe(false);
      });
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"test": 123}', {});
      expect(result).toEqual({ test: 123 });
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJsonParse('invalid json', fallback);
      expect(result).toBe(fallback);
    });

    it('should log error for invalid JSON', () => {
      const { logger } = require('../logger');
      safeJsonParse('invalid', {});
      expect(logger.error).toHaveBeenCalled();
    });
  });
});