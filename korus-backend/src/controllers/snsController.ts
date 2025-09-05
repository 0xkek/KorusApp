import { Request, Response } from 'express'
import { 
  fetchSNSDomainsForWallet, 
  resolveSNSDomain,
  getFavoriteSNSDomain 
} from '../services/snsService'
import { logger } from '../utils/logger'
import { Connection } from '@solana/web3.js'
import { asyncHandler } from '../middleware/errorHandler'
import { AppError } from '../utils/AppError'

/**
 * Get all SNS domains for a wallet
 * GET /api/sns/domains/:walletAddress
 */
export const getSNSDomains = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params
    
    if (!walletAddress) {
      throw new AppError('Wallet address is required', 400, 'MISSING_WALLET')
    }
    
    logger.debug(`[SNS Controller] Getting domains for wallet: ${walletAddress}`)
    
    const domains = await fetchSNSDomainsForWallet(walletAddress)
    
    res.json({
      success: true,
      domains,
      count: domains.length
    })
})

/**
 * Resolve an SNS domain to a wallet address
 * GET /api/sns/resolve/:domain
 */
export const resolveDomain = asyncHandler(async (req: Request, res: Response) => {
    const { domain } = req.params
    
    if (!domain) {
      throw new AppError('Domain is required', 400, 'MISSING_DOMAIN')
    }
    
    logger.debug(`[SNS Controller] Resolving domain: ${domain}`)
    
    const owner = await resolveSNSDomain(domain)
    
    if (!owner) {
      throw new AppError('Domain not found or not registered', 404, 'DOMAIN_NOT_FOUND')
    }
    
    res.json({
      success: true,
      domain,
      owner
    })
})

/**
 * Get the favorite SNS domain for a wallet
 * GET /api/sns/favorite/:walletAddress
 */
export const getFavoriteDomain = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params
    
    if (!walletAddress) {
      throw new AppError('Wallet address is required', 400, 'MISSING_WALLET')
    }
    
    logger.debug(`[SNS Controller] Getting favorite domain for wallet: ${walletAddress}`)
    
    const favoriteDomain = await getFavoriteSNSDomain(walletAddress)
    
    res.json({
      success: true,
      domain: favoriteDomain,
      hasDomain: !!favoriteDomain
    })
})

/**
 * Health check for SNS service
 * GET /api/sns/health
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
    // SNS is on mainnet - use Helius RPC
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY
    const RPC_ENDPOINT = HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com'
    
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')
    
    const slot = await connection.getSlot()
    
    res.json({
      success: true,
      message: 'SNS service is operational',
      rpc: {
        connected: true,
        slot,
        endpoint: 'Helius Mainnet RPC'
      }
    })
})