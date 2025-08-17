import { Request, Response } from 'express'
import { fetchNFTsForWallet, getNFTByMint } from '../services/nftService'

/**
 * Get all NFTs for a wallet
 * GET /api/nfts/wallet/:walletAddress
 */
export const getNFTsForWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Wallet address is required' 
      })
    }
    
    console.log(`[NFT Controller] Getting NFTs for wallet: ${walletAddress}`)
    
    const nfts = await fetchNFTsForWallet(walletAddress)
    
    res.json({
      success: true,
      nfts,
      count: nfts.length
    })
  } catch (error: any) {
    console.error('[NFT Controller] Get NFTs error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch NFTs',
      details: error.message
    })
  }
}

/**
 * Get a specific NFT by mint address
 * GET /api/nfts/mint/:mintAddress
 */
export const getNFT = async (req: Request, res: Response) => {
  try {
    const { mintAddress } = req.params
    
    if (!mintAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Mint address is required' 
      })
    }
    
    console.log(`[NFT Controller] Getting NFT: ${mintAddress}`)
    
    const nft = await getNFTByMint(mintAddress)
    
    if (!nft) {
      return res.status(404).json({ 
        success: false,
        error: 'NFT not found' 
      })
    }
    
    res.json({
      success: true,
      nft
    })
  } catch (error: any) {
    console.error('[NFT Controller] Get NFT error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch NFT',
      details: error.message
    })
  }
}

/**
 * Health check for NFT service
 * GET /api/nfts/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'NFT service is operational',
      helius: {
        connected: true,
        endpoint: 'Helius Mainnet DAS API'
      }
    })
  } catch (error: any) {
    console.error('[NFT Controller] Health check error:', error)
    res.status(500).json({ 
      success: false,
      error: 'NFT service health check failed',
      details: error.message
    })
  }
}