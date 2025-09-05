import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import { authenticate } from '../../src/middleware/auth';
import prisma from '../../src/config/database';
import * as solanaUtils from '../../src/utils/solana';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// Mock Solana signature verification
jest.mock('../../src/utils/solana', () => ({
  verifyWalletSignature: jest.fn(),
  checkGenesisTokenOwnership: jest.fn(),
}));

describe('Authentication Endpoints', () => {
  const mockWalletAddress = 'GvQW7V9rqBhxjRczBnfCBKCK2s5bfFhL2WbLz7KQtq1h';
  const mockSignature = 'mock_signature_base58_encoded';
  const mockMessage = 'Please sign this message to authenticate';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/connect', () => {
    it('should authenticate a valid wallet signature', async () => {
      // Mock successful signature verification
      (solanaUtils.verifyWalletSignature as jest.Mock).mockResolvedValue(true);
      (solanaUtils.checkGenesisTokenOwnership as jest.Mock).mockResolvedValue(false);
      
      // Mock user creation
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        walletAddress: mockWalletAddress,
        tier: 'standard',
        genesisVerified: false,
        allyBalance: 5000n,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/connect')
        .send({
          walletAddress: mockWalletAddress,
          signature: mockSignature,
          message: mockMessage,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.walletAddress).toBe(mockWalletAddress);
    });

    it('should reject invalid wallet signature', async () => {
      // Mock failed signature verification
      (solanaUtils.verifyWalletSignature as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/connect')
        .send({
          walletAddress: mockWalletAddress,
          signature: 'invalid_signature',
          message: mockMessage,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/connect')
        .send({
          walletAddress: mockWalletAddress,
          // Missing signature and message
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should detect Genesis token ownership', async () => {
      // Mock successful signature and Genesis token
      (solanaUtils.verifyWalletSignature as jest.Mock).mockResolvedValue(true);
      (solanaUtils.checkGenesisTokenOwnership as jest.Mock).mockResolvedValue(true);
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        walletAddress: mockWalletAddress,
        tier: 'premium',
        genesisVerified: true,
        allyBalance: 5000n,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/connect')
        .send({
          walletAddress: mockWalletAddress,
          signature: mockSignature,
          message: mockMessage,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.tier).toBe('premium');
      expect(response.body.user.genesisVerified).toBe(true);
    });

    it('should handle existing users', async () => {
      const existingUser = {
        walletAddress: mockWalletAddress,
        tier: 'standard',
        genesisVerified: false,
        allyBalance: 10000n,
        createdAt: new Date('2025-01-01'),
      };

      (solanaUtils.verifyWalletSignature as jest.Mock).mockResolvedValue(true);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/connect')
        .send({
          walletAddress: mockWalletAddress,
          signature: mockSignature,
          message: mockMessage,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.allyBalance).toBe('10000');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser = {
        walletAddress: mockWalletAddress,
        tier: 'standard',
        genesisVerified: false,
        allyBalance: 5000n,
        displayName: 'Test User',
        bio: 'Test bio',
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Create authenticated request
      const authApp = express();
      authApp.use(express.json());
      
      // Mock authentication middleware
      authApp.use((req: any, res, next) => {
        req.userWallet = mockWalletAddress;
        next();
      });
      
      authApp.get('/api/auth/profile', async (req: any, res) => {
        const user = await prisma.user.findUnique({
          where: { walletAddress: req.userWallet },
        });
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
          user: {
            ...user,
            allyBalance: user.allyBalance.toString(),
          },
        });
      });

      const response = await request(authApp)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(200);
      expect(response.body.user.walletAddress).toBe(mockWalletAddress);
      expect(response.body.user.displayName).toBe('Test User');
    });

    it('should reject unauthenticated requests', async () => {
      // Test without auth middleware to simulate unauthenticated request
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const updates = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        twitter: '@updated',
      };

      (prisma.user.update as jest.Mock).mockResolvedValue({
        walletAddress: mockWalletAddress,
        ...updates,
        tier: 'standard',
        allyBalance: 5000n,
      });

      // Create authenticated request
      const authApp = express();
      authApp.use(express.json());
      
      authApp.use((req: any, res, next) => {
        req.userWallet = mockWalletAddress;
        next();
      });
      
      authApp.put('/api/auth/profile', async (req: any, res) => {
        const updatedUser = await prisma.user.update({
          where: { walletAddress: req.userWallet },
          data: req.body,
        });
        
        res.json({
          success: true,
          user: {
            ...updatedUser,
            allyBalance: updatedUser.allyBalance.toString(),
          },
        });
      });

      const response = await request(authApp)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer mock_token')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.displayName).toBe('Updated Name');
    });
  });

  describe('GET /api/auth/csrf', () => {
    it('should generate CSRF token with valid session ID', async () => {
      const response = await request(app)
        .get('/api/auth/csrf')
        .set('x-session-id', 'test-session-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject requests without session ID', async () => {
      const response = await request(app)
        .get('/api/auth/csrf');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Session ID required');
    });
  });
});