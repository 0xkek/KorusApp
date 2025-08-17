import { Request, Response } from 'express'
import { 
  fetchSNSDomainsForWallet, 
  resolveSNSDomain,
  getFavoriteSNSDomain 
} from '../services/snsService'
import { Connection } from '@solana/web3.js'

/**
 * Get all SNS domains for a wallet
 * GET /api/sns/domains/:walletAddress
 */
export const getSNSDomains = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Wallet address is required' 
      })
    }
    
    console.log(`[SNS Controller] Getting domains for wallet: ${walletAddress}`)
    
    const domains = await fetchSNSDomainsForWallet(walletAddress)
    
    res.json({
      success: true,
      domains,
      count: domains.length
    })
  } catch (error: any) {
    console.error('[SNS Controller] Get domains error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch SNS domains',
      details: error.message
    })
  }
}

/**
 * Resolve an SNS domain to a wallet address
 * GET /api/sns/resolve/:domain
 */
export const resolveDomain = async (req: Request, res: Response) => {
  try {
    const { domain } = req.params
    
    if (!domain) {
      return res.status(400).json({ 
        success: false,
        error: 'Domain is required' 
      })
    }
    
    console.log(`[SNS Controller] Resolving domain: ${domain}`)
    
    const owner = await resolveSNSDomain(domain)
    
    if (!owner) {
      return res.status(404).json({ 
        success: false,
        error: 'Domain not found or not registered' 
      })
    }
    
    res.json({
      success: true,
      domain,
      owner
    })
  } catch (error: any) {
    console.error('[SNS Controller] Resolve domain error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to resolve domain',
      details: error.message
    })
  }
}

/**
 * Get the favorite SNS domain for a wallet
 * GET /api/sns/favorite/:walletAddress
 */
export const getFavoriteDomain = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Wallet address is required' 
      })
    }
    
    console.log(`[SNS Controller] Getting favorite domain for wallet: ${walletAddress}`)
    
    const favoriteDomain = await getFavoriteSNSDomain(walletAddress)
    
    res.json({
      success: true,
      domain: favoriteDomain,
      hasDomain: !!favoriteDomain
    })
  } catch (error: any) {
    console.error('[SNS Controller] Get favorite domain error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch favorite domain',
      details: error.message
    })
  }
}

/**
 * Health check for SNS service
 * GET /api/sns/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // SNS is on mainnet - use Helius RPC
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '3d27295a-caf5-4a92-9fee-b52aa43e54bd'
    const RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    
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
  } catch (error: any) {
    console.error('[SNS Controller] Health check error:', error)
    res.status(500).json({ 
      success: false,
      error: 'SNS service health check failed',
      details: error.message
    })
  }
}