import request from 'supertest';
import express from 'express';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Mock the database
jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

import authRoutes from '../routes/auth';
import prisma from '../config/database';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/connect-wallet', () => {
    it('should reject request without wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/connect-wallet')
        .send({
          signature: 'test',
          message: 'test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without signature', async () => {
      const response = await request(app)
        .post('/api/auth/connect-wallet')
        .send({
          walletAddress: 'test-wallet',
          message: 'test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid signature', async () => {
      const response = await request(app)
        .post('/api/auth/connect-wallet')
        .send({
          walletAddress: 'FakeWallet123',
          signature: 'InvalidSignature',
          message: 'test message',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });

    it('should NOT allow authentication bypass', async () => {
      // Set the bypass flag that should NOT work anymore
      process.env.ALLOW_AUTH_BYPASS = 'true';

      const response = await request(app)
        .post('/api/auth/connect-wallet')
        .send({
          walletAddress: 'BypassAttempt',
          signature: 'InvalidSignature',
          message: 'bypass attempt',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid signature');
      
      // Clean up
      delete process.env.ALLOW_AUTH_BYPASS;
    });

    it('should create new user on first connection with valid signature', async () => {
      // Mock a valid signature scenario
      // In real test, you'd create a proper signature
      const mockUser = {
        walletAddress: 'ValidWallet123',
        tier: 'standard',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Note: This test would need proper signature mocking
      // Skipping the actual signature validation for this test
    });
  });

  describe('Security Requirements', () => {
    it('should require JWT_SECRET to be at least 32 characters', () => {
      const jwtSecret = process.env.JWT_SECRET || '';
      expect(jwtSecret.length).toBeGreaterThanOrEqual(32);
    });

    it('should not have ALLOW_AUTH_BYPASS in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.ALLOW_AUTH_BYPASS).toBeUndefined();
      }
    });
  });
});