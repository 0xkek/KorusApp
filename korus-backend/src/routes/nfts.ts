import { Router } from 'express'
import { 
  getNFTsForWallet,
  getNFT,
  healthCheck 
} from '../controllers/nftController'

const router = Router()

// GET /api/nfts/health - Health check for NFT service
router.get('/health', healthCheck)

// GET /api/nfts/wallet/:walletAddress - Get all NFTs for a wallet
router.get('/wallet/:walletAddress', getNFTsForWallet)

// GET /api/nfts/mint/:mintAddress - Get specific NFT by mint
router.get('/mint/:mintAddress', getNFT)

export default router