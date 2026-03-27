import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { toggleFollow, getFollowers, getFollowing, checkFollowing, getFollowingFeed } from '../controllers/followController'

const router = Router()

// Toggle follow/unfollow
router.post('/:wallet/toggle', authenticate, toggleFollow)

// Get followers of a user
router.get('/:wallet/followers', getFollowers)

// Get users a user is following
router.get('/:wallet/following', getFollowing)

// Batch check if current user follows given wallets
router.post('/check', authenticate, checkFollowing)

// Get feed of posts from followed users
router.get('/feed', authenticate, getFollowingFeed)

export default router
