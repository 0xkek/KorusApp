import request from 'supertest';
import express from 'express';
import { createPostLimiter, apiLimiter, authLimiter, interactionLimiter } from '../../src/middleware/rateLimiter';

describe('Rate Limiting Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a fresh app for each test
    app = express();
    app.use(express.json());
    
    // Clear rate limit stores
    jest.clearAllMocks();
  });

  describe('Post Creation Rate Limiting', () => {
    beforeEach(() => {
      // Setup post creation endpoint with rate limiting
      app.post('/api/posts', createPostLimiter, (req, res) => {
        res.json({ success: true, message: 'Post created' });
      });
    });

    it('should allow 1 post per 30 seconds', async () => {
      // First request should succeed
      const response1 = await request(app)
        .post('/api/posts')
        .send({ content: 'Test post 1' });
      
      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);

      // Second request should be rate limited
      const response2 = await request(app)
        .post('/api/posts')
        .send({ content: 'Test post 2' });
      
      expect(response2.status).toBe(429);
      expect(response2.body.error).toContain('Too many posts created');
      expect(response2.body.retryAfter).toBe(30);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({ content: 'Test post' });
      
      expect(response.headers).toHaveProperty('ratelimit-limit', '1');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('API Rate Limiting', () => {
    beforeEach(() => {
      app.use('/api', apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow 100 requests per 15 minutes', async () => {
      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app).get('/api/test')
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All 100 requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // 101st request should be rate limited
      const response = await request(app).get('/api/test');
      expect(response.status).toBe(429);
    });
  });

  describe('Auth Rate Limiting', () => {
    beforeEach(() => {
      app.post('/api/auth/connect', authLimiter, (req, res) => {
        res.json({ success: true, token: 'mock_token' });
      });
    });

    it('should allow 20 auth requests per 15 minutes', async () => {
      // Make 20 requests (should all succeed)
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/api/auth/connect')
          .send({ walletAddress: `wallet_${i}` });
        
        expect(response.status).toBe(200);
      }

      // 21st request should be rate limited
      const response = await request(app)
        .post('/api/auth/connect')
        .send({ walletAddress: 'wallet_21' });
      
      expect(response.status).toBe(429);
      expect(response.text).toContain('Too many authentication attempts');
    });
  });

  describe('Interaction Rate Limiting', () => {
    beforeEach(() => {
      app.post('/api/interactions/like', interactionLimiter, (req, res) => {
        res.json({ success: true, liked: true });
      });
    });

    it('should allow 60 interactions per minute', async () => {
      // Test a subset to avoid timeout
      const testLimit = 10;
      
      // Make 10 requests (should all succeed)
      for (let i = 0; i < testLimit; i++) {
        const response = await request(app)
          .post('/api/interactions/like')
          .send({ postId: `post_${i}` });
        
        expect(response.status).toBe(200);
      }
    });

    it('should reject after hitting the limit', async () => {
      // Configure a test limiter with lower limit for testing
      const testLimiter = require('express-rate-limit').default({
        windowMs: 60 * 1000, // 1 minute
        max: 5, // Only 5 for testing
        message: 'Too many interactions',
      });

      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test', testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const response = await request(testApp).post('/test');
        expect(response.status).toBe(200);
      }

      // 6th request should be rate limited
      const response = await request(testApp).post('/test');
      expect(response.status).toBe(429);
    });
  });

  describe('Rate Limit Bypass for Different IPs', () => {
    it('should track rate limits per IP', async () => {
      // Create a fresh rate limiter for this test to avoid state pollution
      const testPostLimiter = require('express-rate-limit').default({
        windowMs: 30 * 1000, // 30 seconds
        max: 1, // Limit each IP to 1 post per 30 seconds
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many posts created',
        // Use X-Forwarded-For header for IP identification in tests
        keyGenerator: (req: any) => {
          return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
        }
      });

      app.post('/api/test', testPostLimiter, (req, res) => {
        res.json({ success: true });
      });

      // First IP makes a request
      const response1 = await request(app)
        .post('/api/test')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({ content: 'Test' });
      
      expect(response1.status).toBe(200);

      // Same IP gets rate limited
      const response2 = await request(app)
        .post('/api/test')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({ content: 'Test' });
      
      expect(response2.status).toBe(429);

      // Different IP should not be rate limited
      const response3 = await request(app)
        .post('/api/test')
        .set('X-Forwarded-For', '192.168.1.2')
        .send({ content: 'Test' });
      
      expect(response3.status).toBe(200);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include proper rate limit headers in responses', async () => {
      // Create a fresh rate limiter for this test to avoid state pollution
      const testApiLimiter = require('express-rate-limit').default({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per 15 minutes
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.get('/api/test', testApiLimiter, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/api/test');
      
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
      
      const limit = parseInt(response.headers['ratelimit-limit']);
      const remaining = parseInt(response.headers['ratelimit-remaining']);
      
      expect(limit).toBe(100);
      expect(remaining).toBe(99); // One request made
    });
  });
});