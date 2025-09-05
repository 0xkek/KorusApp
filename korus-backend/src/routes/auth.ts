import { Router, Request, Response, NextFunction } from 'express'
import { connectWallet, getProfile, updateProfile } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { generateCSRFToken } from '../middleware/security'
import { authRateLimiter, burstProtection } from '../middleware/advancedRateLimiter'

const router = Router()

/**
 * @swagger
 * /api/auth/csrf:
 *   get:
 *     tags: [Authentication]
 *     summary: Generate CSRF token
 *     description: Generate a CSRF token for state-changing operations
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to bind the CSRF token to
 *     responses:
 *       200:
 *         description: CSRF token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "csrf_token_example"
 *       400:
 *         description: Session ID required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Session ID required"
 */
router.get('/csrf', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' })
  }
  
  // Generate CSRF token using the security middleware function
  const token = generateCSRFToken(sessionId)
  
  res.json({ token })
})

// Wrapper to handle async errors in Express
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @swagger
 * /api/auth/connect:
 *   post:
 *     tags: [Authentication]
 *     summary: Connect wallet and authenticate
 *     description: Authenticate using Solana wallet signature
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - signature
 *               - message
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
 *                 example: 'GvQW7V9rqBhxjRczBnfCBKCK2s5bfFhL2WbLz7KQtq1h'
 *                 description: Solana wallet address
 *               signature:
 *                 type: string
 *                 description: Signature of the message
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 description: Message that was signed
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 expiresIn:
 *                   type: string
 *                   example: '7d'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/connect', burstProtection, authRateLimiter, asyncHandler(connectWallet))

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile
 *     description: Get the authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/profile', authenticate, asyncHandler(getProfile))

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               snsUsername:
 *                 type: string
 *                 example: 'korus.sol'
 *               nftAvatar:
 *                 type: string
 *                 format: uri
 *                 example: 'https://nft.storage/avatar.png'
 *               displayName:
 *                 type: string
 *                 example: 'Korus User'
 *               bio:
 *                 type: string
 *                 example: 'Web3 enthusiast'
 *               location:
 *                 type: string
 *                 example: 'San Francisco, CA'
 *               website:
 *                 type: string
 *                 format: uri
 *                 example: 'https://korus.app'
 *               twitter:
 *                 type: string
 *                 example: '@korusapp'
 *               themeColor:
 *                 type: string
 *                 example: '#8B5CF6'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile', authenticate, asyncHandler(updateProfile))

export default router