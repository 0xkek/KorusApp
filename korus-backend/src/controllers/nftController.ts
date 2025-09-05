import { Request, Response } from 'express'
import { fetchNFTsForWallet, getNFTByMint } from '../services/nftService'
import { asyncHandler } from '../middleware/errorHandler'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'

/**
 * Get all NFTs for a wallet
 * GET /api/nfts/wallet/:walletAddress
 */
export const getNFTsForWallet = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params
    const { page = '1', limit = '20', includeSpam = 'false' } = req.query
    
    if (!walletAddress) {
      throw new AppError('Wallet address is required', 400, 'MISSING_WALLET')
    }
    
    logger.debug(`[NFT Controller] Getting NFTs for wallet: ${walletAddress}, page: ${page}`)
    
    const result = await fetchNFTsForWallet(walletAddress, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      includeSpam: includeSpam === 'true'
    })
    
    res.json({
      success: true,
      ...result
    })
})

/**
 * Get a specific NFT by mint address
 * GET /api/nfts/mint/:mintAddress
 */
export const getNFT = asyncHandler(async (req: Request, res: Response) => {
    const { mintAddress } = req.params
    
    if (!mintAddress) {
      throw new AppError('Mint address is required', 400, 'MISSING_MINT')
    }
    
    logger.debug(`[NFT Controller] Getting NFT: ${mintAddress}`)
    
    const nft = await getNFTByMint(mintAddress)
    
    if (!nft) {
      throw new AppError('NFT not found', 404, 'NFT_NOT_FOUND')
    }
    
    res.json({
      success: true,
      nft
    })
})

/**
 * Health check for NFT service
 * GET /api/nfts/health
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'NFT service is operational',
      helius: {
        connected: true,
        endpoint: 'Helius Mainnet DAS API'
      }
    })
})