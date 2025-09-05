import { Router } from 'express'
import { createReply, getReplies, likeReply } from '../controllers/repliesController'
import { authenticate } from '../middleware/auth'
import { validateCreateReply, validateLike } from '../middleware/validation'
import { checkSuspension, checkWarnings } from '../middleware/moderationCheck'
import { createReplyRateLimiter, readPostsRateLimiter, interactionsRateLimiter, burstProtection } from '../middleware/advancedRateLimiter'

const router = Router()

/**
 * @swagger
 * /api/posts/{id}/replies:
 *   post:
 *     tags: [Replies]
 *     summary: Create reply to post
 *     description: Create a reply to a post. Requires authentication and passes moderation checks.
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Reply content
 *               parentReplyId:
 *                 type: string
 *                 description: ID of parent reply if replying to a reply
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of attached image
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of attached video
 *     responses:
 *       201:
 *         description: Reply created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reply:
 *                   $ref: '#/components/schemas/Reply'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: User is suspended or has too many warnings
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/:id/replies', authenticate, checkSuspension, checkWarnings, burstProtection, createReplyRateLimiter, validateCreateReply, createReply)

/**
 * @swagger
 * /api/posts/{id}/replies:
 *   get:
 *     tags: [Replies]
 *     summary: Get replies for post
 *     description: Get all replies for a specific post
 *     parameters:
 *       - $ref: '#/components/parameters/postId'
 *     responses:
 *       200:
 *         description: Replies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 replies:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reply'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.get('/:id/replies', readPostsRateLimiter, getReplies)

/**
 * @swagger
 * /api/replies/{id}/like:
 *   post:
 *     tags: [Interactions]
 *     summary: Like/unlike a reply
 *     description: Toggle like status on a reply
 *     security:
 *       - bearerAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reply ID
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
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/:id/like', authenticate, interactionsRateLimiter, validateLike, likeReply)

export default router