import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateUsername, normalizeUsername } from '../utils/usernameValidation';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userWallet = req.userWallet!;
    
    const user = await prisma.user.findUnique({
      where: { walletAddress: userWallet },
      select: {
        walletAddress: true,
        username: true,
        snsUsername: true,
        displayName: true,
        bio: true,
        location: true,
        website: true,
        twitter: true,
        nftAvatar: true,
        themeColor: true,
        tier: true,
        reputationScore: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /api/user/username
 * Set or update username
 */
router.post('/username', authenticate, async (req: AuthRequest, res) => {
  try {
    const userWallet = req.userWallet!;
    const { username } = req.body;

    // Validate username
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: userWallet },
      select: { username: true }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has a username (can only set once, or allow changes?)
    // For now, let's allow changes but with rate limiting
    
    // Normalize username for storage
    const normalizedUsername = normalizeUsername(username);

    // Check if username is already taken
    const usernameTaken = await prisma.user.findFirst({
      where: { 
        username: normalizedUsername,
        NOT: { walletAddress: userWallet }
      }
    });

    if (usernameTaken) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Update username
    const updatedUser = await prisma.user.update({
      where: { walletAddress: userWallet },
      data: { username: normalizedUsername },
      select: { username: true }
    });

    logger.log(`Username set for ${userWallet}: ${normalizedUsername}`);

    res.json({ 
      success: true, 
      username: updatedUser.username,
      message: 'Username updated successfully' 
    });
  } catch (error) {
    logger.error('Error setting username:', error);
    res.status(500).json({ error: 'Failed to set username' });
  }
});

/**
 * GET /api/user/check-username
 * Check if username is available
 */
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return res.json({ 
        available: false, 
        error: validation.error 
      });
    }

    // Normalize username
    const normalizedUsername = normalizeUsername(username);

    // Check if username exists
    const existingUser = await prisma.user.findFirst({
      where: { username: normalizedUsername }
    });

    res.json({ 
      available: !existingUser,
      username: username
    });
  } catch (error) {
    logger.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

/**
 * GET /api/user/by-username/:username
 * Get user by username
 */
router.get('/by-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const normalizedUsername = normalizeUsername(username);

    const user = await prisma.user.findFirst({
      where: { username: normalizedUsername },
      select: {
        walletAddress: true,
        username: true,
        displayName: true,
        bio: true,
        nftAvatar: true,
        tier: true,
        reputationScore: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error fetching user by username:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;