import { logger } from '../utils/logger'
import { Connection, PublicKey } from '@solana/web3.js'
import { 
  getAllDomains, 
  performReverseLookup,
  getDomainKeySync,
  NameRegistryState
} from '@bonfida/spl-name-service'

// SNS domains are on mainnet - use Helius RPC for better reliability
const HELIUS_API_KEY = process.env.HELIUS_API_KEY
if (!HELIUS_API_KEY) {
  logger.error('WARNING: HELIUS_API_KEY not set - SNS lookups may be rate limited')
}
const RPC_ENDPOINT = HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com'

const connection = new Connection(RPC_ENDPOINT, 'confirmed')

export interface SNSDomain {
  domain: string
  owner: string
  favorite?: boolean
}

/**
 * Fetch all SNS domains owned by a wallet address
 */
export async function fetchSNSDomainsForWallet(walletAddress: string): Promise<SNSDomain[]> {
  try {
    logger.debug(`Fetching SNS domains for wallet: ${walletAddress}`)
    
    // Validate wallet address
    let owner: PublicKey
    try {
      owner = new PublicKey(walletAddress)
    } catch (error) {
      logger.error('Invalid wallet address:', walletAddress)
      return []
    }
    
    // Fetch all domain public keys owned by this wallet
    logger.debug('Calling getAllDomains with owner:', owner.toString())
    const domainKeys = await getAllDomains(connection, owner)
    logger.debug('getAllDomains returned:', domainKeys)
    
    if (!domainKeys || domainKeys.length === 0) {
      logger.debug('No domains found for wallet:', walletAddress)
      return []
    }
    
    logger.debug(`Found ${domainKeys.length} domain keys for wallet`)
    
    // Resolve each domain key to get the actual domain name
    const domainNames = await Promise.all(
      domainKeys.map(async (domainKey) => {
        try {
          const domainName = await performReverseLookup(connection, domainKey)
          return domainName
        } catch (error) {
          logger.error('Error resolving domain key:', domainKey.toString(), error)
          return null
        }
      })
    )
    
    // Filter out any failed lookups and format as our SNSDomain type
    const snsDomains: SNSDomain[] = domainNames
      .filter((name): name is string => name !== null)
      .map((domainName, index) => ({
        domain: domainName + '.sol',
        owner: walletAddress,
        favorite: index === 0 // Set first domain as favorite
      }))
    
    logger.debug(`Successfully resolved ${snsDomains.length} domains:`, snsDomains.map(d => d.domain))
    
    return snsDomains
  } catch (error) {
    logger.error('Error fetching SNS domains:', error)
    return []
  }
}

/**
 * Resolve a .sol domain to a wallet address
 */
export async function resolveSNSDomain(domain: string): Promise<string | null> {
  try {
    logger.debug(`Resolving SNS domain: ${domain}`)
    
    // Remove .sol suffix if present
    const domainName = domain.replace('.sol', '')
    
    try {
      // Get the domain key
      const { pubkey: domainKey } = getDomainKeySync(domainName)
      
      // Fetch the domain registry state
      const registry = await NameRegistryState.retrieve(connection, domainKey)
      
      // Check different possible owner fields based on the registry structure
      let ownerAddress: string | null = null
      
      if (registry) {
        if (registry.registry && registry.registry.owner) {
          ownerAddress = registry.registry.owner.toString()
        } else if (registry.nftOwner) {
          ownerAddress = registry.nftOwner.toString()
        } else if ((registry as any).owner) {
          ownerAddress = (registry as any).owner.toString()
        }
      }
      
      if (ownerAddress) {
        logger.debug(`Domain ${domain} resolved to: ${ownerAddress}`)
        return ownerAddress
      }
    } catch (innerError: any) {
      // Domain might not exist or have different structure
      logger.debug(`Domain ${domain} lookup failed:`, innerError.message)
    }
    
    logger.debug(`Could not resolve domain ${domain}`)
    return null
  } catch (error) {
    logger.error('Error resolving SNS domain:', error)
    return null
  }
}

/**
 * Get the favorite/primary SNS domain for a wallet
 */
export async function getFavoriteSNSDomain(walletAddress: string): Promise<string | null> {
  try {
    const domains = await fetchSNSDomainsForWallet(walletAddress)
    
    // Find the favorite domain
    const favorite = domains.find(d => d.favorite)
    if (favorite) return favorite.domain
    
    // If no favorite, return the first domain
    if (domains.length > 0) return domains[0].domain
    
    return null
  } catch (error) {
    logger.error('Error getting favorite SNS domain:', error)
    return null
  }
}