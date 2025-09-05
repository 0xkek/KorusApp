import { Router } from 'express'
import { 
  getSNSDomains, 
  resolveDomain,
  getFavoriteDomain,
  healthCheck
} from '../controllers/snsController'
import { snsLimiter } from '../middleware/rateLimiter'
import { validateSNSWallet, validateSNSDomain } from '../middleware/validation'

const router = Router()

// GET /api/sns/health - Health check for SNS service
router.get('/health', healthCheck)

// GET /api/sns/domains/:walletAddress - Get all domains for a wallet
router.get('/domains/:walletAddress', validateSNSWallet, snsLimiter, getSNSDomains)

// GET /api/sns/resolve/:domain - Resolve a domain to a wallet address
router.get('/resolve/:domain', validateSNSDomain, snsLimiter, resolveDomain)

// GET /api/sns/favorite/:walletAddress - Get favorite domain for a wallet
router.get('/favorite/:walletAddress', validateSNSWallet, snsLimiter, getFavoriteDomain)

export default router