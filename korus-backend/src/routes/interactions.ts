import { Router } from 'express'
import { getPostInteractions, likePost, tipPost, getUserInteractions } from '../controllers/interactionsController'
import { authenticate } from '../middleware/auth'

const router = Router()

// POST /api/interactions/posts/:id/like - Like/unlike a post
router.post('/posts/:id/like', authenticate, likePost)

// POST /api/interactions/posts/:id/tip - Tip a post with $ALLY
router.post('/posts/:id/tip', authenticate, tipPost)

// GET /api/interactions/posts/:id - Get all interactions for a post
router.get('/posts/:id', getPostInteractions)

// POST /api/interactions/user - Get user's interactions for multiple posts
router.post('/user', authenticate, getUserInteractions)

export default router