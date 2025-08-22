import request from 'supertest';
import express from 'express';
import healthRoutes from '../routes/health';

// Create a test app
const app = express();
app.use('/api', healthRoutes);

describe('Health Check Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return OK status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'Korus Backend is running!');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    it('should return correct content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);
    });
  });

  describe('GET /api/health/db', () => {
    it('should return database status', async () => {
      const response = await request(app)
        .get('/api/health/db')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      // Database might be connected or in mock mode
      expect(response.body).toHaveProperty('database');
    });
  });
});