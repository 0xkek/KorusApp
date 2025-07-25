import { Router } from 'express'
import { searchPosts, searchUsers } from '../controllers/searchController'

const router = Router()

// GET /api/search - Search posts and users
router.get('/', searchPosts)

// GET /api/search/users - Search users specifically
router.get('/users', searchUsers)

export default router