import { Router } from 'express'
import { searchPosts, searchUsers } from '../controllers/searchController'
import { searchLimiter } from '../middleware/rateLimiter'
import { validateSearch } from '../middleware/validation'

const router = Router()

// GET /api/search - Search posts and users
router.get('/', validateSearch, searchLimiter, searchPosts)

// GET /api/search/users - Search users specifically
router.get('/users', validateSearch, searchLimiter, searchUsers)

export default router