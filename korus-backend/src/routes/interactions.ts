import { Router } from 'express'
import { getPostInteractions, likePost, tipPost, getUserInteractions } from '../controllers/interactionsController'
import { authenticate } from '../middleware/auth'
import { requireTokenFeatures } from '../middleware/tokenFeatures'
import { validateLike, validateTip, validateBatchInteractions } from '../middleware/validation'
import { interactionLimiter } from '../middleware/rateLimiter'

const router = Router()

/**
 * @swagger
 * /api/interactions/posts/{id}/like:
 *   post:
 *     tags: [Interactions]
 *     summary: Like/unlike a post
 *     description: Toggle like status on a post
 *     security:
 *       - bearerAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/postId'
 *     responses:
 *       200:
 *         description: Like status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 liked:
 *                   type: boolean
 *                   description: New like status
 *                 likeCount:
 *                   type: integer
 *                   description: Updated like count
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/posts/:id/like', authenticate, validateLike, likePost)

/**
 * @swagger
 * /api/interactions/posts/{id}/tip:
 *   post:
 *     tags: [Interactions]
 *     summary: Tip a post with $ALLY
 *     description: Send a tip to a post author using $ALLY tokens (requires token features enabled)
 *     security:
 *       - bearerAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/postId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.000001
 *                 maximum: 1000000
 *                 example: 100
 *                 description: Amount of $ALLY to tip
 *     responses:
 *       200:
 *         description: Tip sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tip:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: string
 *                       example: '100'
 *                     fromWallet:
 *                       type: string
 *                     toWallet:
 *                       type: string
 *                 newBalance:
 *                   type: string
 *                   description: Sender's new $ALLY balance
 *       400:
 *         description: Insufficient balance or invalid amount
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       503:
 *         description: Token features are disabled
 */
router.post('/posts/:id/tip', authenticate, requireTokenFeatures, validateTip, tipPost)

/**
 * @swagger
 * /api/interactions/posts/{id}:
 *   get:
 *     tags: [Interactions]
 *     summary: Get post interactions
 *     description: Get all interactions (likes, tips) for a specific post
 *     parameters:
 *       - $ref: '#/components/parameters/postId'
 *     responses:
 *       200:
 *         description: Interactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 interactions:
 *                   type: object
 *                   properties:
 *                     likeCount:
 *                       type: integer
 *                       example: 42
 *                     tipCount:
 *                       type: integer
 *                       example: 5
 *                     totalTipAmount:
 *                       type: string
 *                       example: '500'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.get('/posts/:id', validateLike, interactionLimiter, getPostInteractions)

/**
 * @swagger
 * /api/interactions/user:
 *   post:
 *     tags: [Interactions]
 *     summary: Get user interactions batch
 *     description: Get authenticated user's interactions for multiple posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postIds
 *             properties:
 *               postIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: string
 *                 description: Array of post IDs to check interactions for
 *     responses:
 *       200:
 *         description: User interactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 interactions:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       liked:
 *                         type: boolean
 *                       tipped:
 *                         type: boolean
 *                       tipAmount:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/user', authenticate, validateBatchInteractions, getUserInteractions)

export default router