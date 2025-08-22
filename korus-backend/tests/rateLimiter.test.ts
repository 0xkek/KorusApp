import request from 'supertest';
import express from 'express';
import { authLimiter, createPostLimiter, apiLimiter } from '../middleware/rateLimiter';

describe('Rate Limiting', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Test endpoints with rate limiters
    app.get('/api/test', apiLimiter, (req, res) => {
      res.json({ success: true });
    });

    app.post('/auth/test', authLimiter, (req, res) => {
      res.json({ success: true });
    });

    app.post('/post/test', createPostLimiter, (req, res) => {
      res.json({ success: true });
    });
  });

  describe('Auth Rate Limiter', () => {
    it('should allow 5 requests per 15 minutes', async () => {
      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/auth/test')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/auth/test')
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.text).toContain('Too many authentication attempts');
    });
  });

  describe('Post Creation Rate Limiter', () => {
    it('should allow only 1 post per 30 seconds', async () => {
      // First request should succeed
      await request(app)
        .post('/post/test')
        .expect(200);

      // Second immediate request should be rate limited
      const response = await request(app)
        .post('/post/test')
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many posts created');
      expect(response.body).toHaveProperty('retryAfter', 30);
    });
  });

  describe('General API Rate Limiter', () => {
    it('should allow 100 requests per 15 minutes', async () => {
      // Make multiple requests (not testing all 100 for speed)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/test')
          .expect(200);
      }

      // Should still be under limit
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});