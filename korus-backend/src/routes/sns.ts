import { Router } from 'express'
import { 
  getSNSDomains, 
  resolveDomain,
  getFavoriteDomain,
  healthCheck
} from '../controllers/snsController'

const router = Router()

// GET /api/sns/health - Health check for SNS service
router.get('/health', healthCheck)

// GET /api/sns/domains/:walletAddress - Get all domains for a wallet
router.get('/domains/:walletAddress', getSNSDomains)

// GET /api/sns/resolve/:domain - Resolve a domain to a wallet address
router.get('/resolve/:domain', resolveDomain)

// GET /api/sns/favorite/:walletAddress - Get favorite domain for a wallet
router.get('/favorite/:walletAddress', getFavoriteDomain)

export default router