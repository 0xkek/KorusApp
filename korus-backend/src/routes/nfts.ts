import { Router } from 'express'
import { 
  getNFTsForWallet,
  getNFT,
  healthCheck 
} from '../controllers/nftController'
import { nftLimiter } from '../middleware/rateLimiter'
import { validateNFTWallet, validateNFTMint } from '../middleware/validation'

const router = Router()

// GET /api/nfts/health - Health check for NFT service
router.get('/health', healthCheck)

// GET /api/nfts/wallet/:walletAddress - Get all NFTs for a wallet
router.get('/wallet/:walletAddress', validateNFTWallet, nftLimiter, getNFTsForWallet)

// GET /api/nfts/mint/:mintAddress - Get specific NFT by mint
router.get('/mint/:mintAddress', validateNFTMint, nftLimiter, getNFT)

export default router