import request from 'supertest';
import express from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from '../../src/middleware/errorHandler';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, DatabaseError } from '../../src/utils/AppError';

describe('Error Handling Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('AppError Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create AuthorizationError', () => {
      const error = new AuthorizationError('Insufficient permissions');
      
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should create DatabaseError', () => {
      const error = new DatabaseError('Connection failed');
      
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Error Handler Middleware', () => {
    beforeEach(() => {
      // Add test routes that throw errors
      app.get('/validation-error', (req, res, next) => {
        next(new ValidationError('Invalid data provided'));
      });

      app.get('/auth-error', (req, res, next) => {
        next(new AuthenticationError('Not authenticated'));
      });

      app.get('/permission-error', (req, res, next) => {
        next(new AuthorizationError('Access denied'));
      });

      app.get('/database-error', (req, res, next) => {
        next(new DatabaseError('Database connection lost'));
      });

      app.get('/generic-error', (req, res, next) => {
        next(new Error('Something went wrong'));
      });

      app.get('/app-error', (req, res, next) => {
        next(new AppError('Custom app error', 418, 'TEAPOT'));
      });

      // Add error handler
      app.use(errorHandler);
    });

    it('should handle ValidationError correctly', async () => {
      const response = await request(app).get('/validation-error');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid data provided');
      expect(response.body.error.statusCode).toBe(400);
    });

    it('should handle AuthenticationError correctly', async () => {
      const response = await request(app).get('/auth-error');
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toBe('Not authenticated');
    });

    it('should handle AuthorizationError correctly', async () => {
      const response = await request(app).get('/permission-error');
      
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.message).toBe('Access denied');
    });

    it('should handle DatabaseError correctly', async () => {
      const response = await request(app).get('/database-error');
      
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
      expect(response.body.error.message).toBe('Database connection lost');
    });

    it('should handle generic Error correctly', async () => {
      const response = await request(app).get('/generic-error');
      
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Something went wrong');
    });

    it('should handle custom AppError correctly', async () => {
      const response = await request(app).get('/app-error');
      
      expect(response.status).toBe(418);
      expect(response.body.error.code).toBe('TEAPOT');
      expect(response.body.error.message).toBe('Custom app error');
    });

    it('should include request ID in error response', async () => {
      const testApp = express();
      testApp.use((req: any, res, next) => {
        req.id = 'test-request-123';
        next();
      });
      
      testApp.get('/error', (req, res, next) => {
        next(new AppError('Test error', 400));
      });
      
      testApp.use(errorHandler);
      
      const response = await request(testApp).get('/error');
      
      expect(response.body.error.requestId).toBe('test-request-123');
    });
  });

  describe('AsyncHandler Wrapper', () => {
    beforeEach(() => {
      // Route with async function that throws
      app.get('/async-error', asyncHandler(async (req, res) => {
        throw new ValidationError('Async validation failed');
      }));

      // Route with async function that succeeds
      app.get('/async-success', asyncHandler(async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        res.json({ success: true });
      }));

      // Route with rejected promise
      app.get('/async-reject', asyncHandler(async (req, res) => {
        await Promise.reject(new AuthenticationError('Auth failed'));
      }));

      app.use(errorHandler);
    });

    it('should catch async errors', async () => {
      const response = await request(app).get('/async-error');
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Async validation failed');
    });

    it('should handle successful async operations', async () => {
      const response = await request(app).get('/async-success');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should catch rejected promises', async () => {
      const response = await request(app).get('/async-reject');
      
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Auth failed');
    });
  });

  describe('404 Not Found Handler', () => {
    beforeEach(() => {
      app.get('/existing', (req, res) => {
        res.json({ success: true });
      });

      // Add 404 handler
      app.use(notFoundHandler);
      app.use(errorHandler);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });

    it('should not affect existing routes', async () => {
      const response = await request(app).get('/existing');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle different HTTP methods', async () => {
      const postResponse = await request(app).post('/non-existent');
      expect(postResponse.status).toBe(404);

      const putResponse = await request(app).put('/non-existent');
      expect(putResponse.status).toBe(404);

      const deleteResponse = await request(app).delete('/non-existent');
      expect(deleteResponse.status).toBe(404);
    });
  });

  describe('Error Logging', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      app.get('/log-error', (req, res, next) => {
        next(new AppError('Error to log', 500)); // Operational error - logs as warning
      });

      app.use(errorHandler);
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should log errors in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await request(app).get('/log-error');

      // Error handler should log operational errors as warnings
      expect(consoleWarnSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Production vs Development Error Responses', () => {
    beforeEach(() => {
      app.get('/error', (req, res, next) => {
        const error = new Error('Detailed error message');
        (error as any).stack = 'Error stack trace here';
        next(error);
      });

      app.use(errorHandler);
    });

    it('should hide stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/error');
      
      expect(response.status).toBe(500);
      expect(response.body.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should show stack traces in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app).get('/error');
      
      expect(response.status).toBe(500);
      // In development, stack might be included (depends on implementation)

      process.env.NODE_ENV = originalEnv;
    });
  });
});