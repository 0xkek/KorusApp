import { Connection, PublicKey } from '@solana/web3.js'
import { 
  getAllDomains, 
  performReverseLookup,
  getDomainKeySync,
  NameRegistryState
} from '@bonfida/spl-name-service'

// SNS domains are on mainnet - use Helius RPC for better reliability
// Fallback to public RPC if Helius is not configured
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '3d27295a-caf5-4a92-9fee-b52aa43e54bd'
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
    console.log(`Fetching SNS domains for wallet: ${walletAddress}`)
    
    // Validate wallet address
    let owner: PublicKey
    try {
      owner = new PublicKey(walletAddress)
    } catch (error) {
      console.error('Invalid wallet address:', walletAddress)
      return []
    }
    
    // Fetch all domain public keys owned by this wallet
    console.log('Calling getAllDomains with owner:', owner.toString())
    const domainKeys = await getAllDomains(connection, owner)
    console.log('getAllDomains returned:', domainKeys)
    
    if (!domainKeys || domainKeys.length === 0) {
      console.log('No domains found for wallet:', walletAddress)
      return []
    }
    
    console.log(`Found ${domainKeys.length} domain keys for wallet`)
    
    // Resolve each domain key to get the actual domain name
    const domainNames = await Promise.all(
      domainKeys.map(async (domainKey) => {
        try {
          const domainName = await performReverseLookup(connection, domainKey)
          return domainName
        } catch (error) {
          console.error('Error resolving domain key:', domainKey.toString(), error)
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
    
    console.log(`Successfully resolved ${snsDomains.length} domains:`, snsDomains.map(d => d.domain))
    
    return snsDomains
  } catch (error) {
    console.error('Error fetching SNS domains:', error)
    return []
  }
}

/**
 * Resolve a .sol domain to a wallet address
 */
export async function resolveSNSDomain(domain: string): Promise<string | null> {
  try {
    console.log(`Resolving SNS domain: ${domain}`)
    
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
        console.log(`Domain ${domain} resolved to: ${ownerAddress}`)
        return ownerAddress
      }
    } catch (innerError: any) {
      // Domain might not exist or have different structure
      console.log(`Domain ${domain} lookup failed:`, innerError.message)
    }
    
    console.log(`Could not resolve domain ${domain}`)
    return null
  } catch (error) {
    console.error('Error resolving SNS domain:', error)
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
    console.error('Error getting favorite SNS domain:', error)
    return null
  }
}