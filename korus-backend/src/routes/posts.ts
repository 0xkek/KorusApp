import { Router } from 'express'
import { createPost, getPosts, getSinglePost } from '../controllers/postsController'
import { authenticate } from '../middleware/auth'
import { validateCreatePost, validateGetPosts } from '../middleware/validation'
import { checkSuspension, checkWarnings } from '../middleware/moderationCheck'
import { createPostRateLimiter, readPostsRateLimiter, burstProtection } from '../middleware/advancedRateLimiter'

const router = Router()

/**
 * @swagger
 * /api/posts:
 *   get:
 *     tags: [Posts]
 *     summary: Get posts feed
 *     description: Get a chronological feed of posts with optional filtering
 *     parameters:
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *           maxLength: 50
 *           pattern: '^[a-zA-Z0-9\s-]+$'
 *         description: Filter by topic
 *       - in: query
 *         name: subtopic
 *         schema:
 *           type: string
 *           maxLength: 50
 *           pattern: '^[a-zA-Z0-9\s-]+$'
 *         description: Filter by subtopic
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of posts to skip
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.get('/', burstProtection, readPostsRateLimiter, validateGetPosts, getPosts)

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     tags: [Posts]
 *     summary: Get single post
 *     description: Get a single post by ID with its replies
 *     parameters:
 *       - $ref: '#/components/parameters/postId'
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.get('/:id', readPostsRateLimiter, getSinglePost)

/**
 * @swagger
 * /api/posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create new post
 *     description: Create a new post. Requires authentication and passes moderation checks.
 *     security:
 *       - bearerAuth: []
 *       - csrfToken: []
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
 *                 description: Post content
 *               topic:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9\s-]+$'
 *                 description: Post topic (will be converted to uppercase)
 *               subtopic:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9\s-]+$'
 *                 description: Post subtopic (will be converted to lowercase)
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
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: User is suspended or has too many warnings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit - 1 post per 30 seconds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Too many posts created. Please wait 30 seconds before posting again.'
 *                 retryAfter:
 *                   type: integer
 *                   example: 30
 */
router.post('/', authenticate, checkSuspension, checkWarnings, burstProtection, createPostRateLimiter, validateCreatePost, createPost)

export default router