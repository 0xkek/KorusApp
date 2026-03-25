import { logger } from '../utils/logger'
import { Connection } from '@solana/web3.js'
import { NFT_CONFIG } from '../config/constants'

export interface NFT {
  name: string
  symbol: string
  uri: string
  image?: string
  mint: string
  updateAuthority?: string
  collection?: {
    name: string
    family?: string
  }
}

// Use Helius RPC for NFT fetching
const HELIUS_API_KEY = process.env.HELIUS_API_KEY
const HELIUS_RPC_URL = HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com' // Fallback to public RPC

if (!HELIUS_API_KEY) {
  logger.warn('HELIUS_API_KEY not set - NFT fetching may be limited')
}

// Industry-standard spam detection patterns based on Phantom/Solana wallet research
const SPAM_PATTERNS = [
  // === SCAM KEYWORDS (High priority) ===
  /airdrop/i,
  /claim/i,
  /free\s*(mint|nft|token)/i,
  /giveaway/i,
  /reward/i,
  /winner/i,
  /you'?ve?\s*won/i,
  /congratulations/i,
  /eligible/i,
  /snapshot/i,
  /whitelist/i,
  /verify/i,
  /redeem/i,
  /bonus/i,

  // === PHISHING PATTERNS ===
  /click\s*(here|link|below)/i,
  /visit\s*(our|the)?\s*(website|site|link)/i,
  /connect.*wallet/i,
  /wallet.*verify/i,
  /(discord|telegram|twitter).*join/i,
  /follow.*us/i,

  // === URGENCY TACTICS ===
  /limited\s*time/i,
  /act\s*now/i,
  /expires?\s*(soon|today|tonight)/i,
  /hurry/i,
  /don't\s*miss/i,

  // === TOKEN SCAMS ===
  /\$\d+\s*(usdc|sol|usdt|bonk|wif|bome)/i, // Price advertising
  /\d{3,}\s*\$[a-z]+/i, // "3000$W", "4000$BOME"
  /^(pump|bome|wif|jup|bonk|pepe)\s/i, // Token names at start
  /\d+\s*(usdc|sol|usdt|bonk)\s*(airdrop|drop|claim)/i,

  // === DROP/TICKET SCAMS ===
  /\sdrop(\s|$)/i, // "X Drop" or "Drop X"
  /drop\s*box/i,
  /ticket/i,
  /mint\s*pass/i,

  // === GENERIC/LOW EFFORT ===
  /^(test|demo|sample|example)/i,
  /^\d+$/, // Just numbers
  /^#\d+$/, // Just #numbers
  /^NFT\s*#?\d+$/i, // Generic "NFT #123"
  /^(mint|token|asset|item)\s*#?\d+$/i,
  /^untitled/i,
  /^unnamed/i,
  /^(common|uncommon|rare|epic|legendary)\s*#?\d+$/i,
  /^nft$/i,
  /^solana/i,
  /^sol\s*#?\d+$/i,

  // === SUSPICIOUS SHORT NAMES ===
  /^(CM|CC|CD|CE|CF|CG|CH|CI|CJ|CK)$/i, // Candy Machine codes
  /^[A-Z]{1,2}$/,  // 1-2 letter names

  // === DOMAIN NAMES (Phishing) ===
  /\.(com|io|xyz|site|cc|net|org|app|co)/i,
  /https?:\/\//i, // Any URL

  // === EMPTY/INVALID ===
  /^\s*$/, // Empty names
  /^\.+$/, // Just dots
  /^_+$/, // Just underscores
  /^-+$/, // Just dashes
]

// Use verified collections from config
const VERIFIED_COLLECTIONS = NFT_CONFIG.VERIFIED_COLLECTIONS

function isSpamNFT(nft: any): boolean {
  const name = nft.content?.metadata?.name || nft.name || ''
  const collectionName = nft.grouping?.[0]?.collection_metadata?.name || nft.collection?.name || ''
  const symbol = nft.content?.metadata?.symbol || nft.symbol || ''
  const description = nft.content?.metadata?.description || ''

  // 1. VERIFIED COLLECTIONS - Always show these (highest priority)
  if (VERIFIED_COLLECTIONS.some(vc =>
    collectionName.toLowerCase().includes(vc.toLowerCase())
  )) {
    return false
  }

  // 2. HELIUS BURNT FLAG - Always filter burnt NFTs
  if (nft.burnt === true) {
    return true
  }

  // 3. CHECK NAME, SYMBOL, AND DESCRIPTION for spam patterns
  const textToCheck = `${name} ${symbol} ${description}`.toLowerCase()

  if (SPAM_PATTERNS.some(pattern => pattern.test(textToCheck))) {
    return true
  }

  // 4. SUSPICIOUS COMPRESSED NFTs without collection
  if (nft.compression?.compressed && !collectionName) {
    return true
  }

  // 5. DELEGATED OWNERSHIP without collection (suspicious pattern)
  if (nft.ownership?.delegated === true && !collectionName) {
    return true
  }

  // 6. NO METADATA = likely spam
  if (!name || name.trim() === '') {
    return true
  }

  return false
}

/**
 * Fetch NFTs owned by a wallet using Helius DAS API
 * Paginates through all Helius pages to get the complete collection
 */
export async function fetchNFTsForWallet(
  walletAddress: string,
  options?: {
    page?: number
    limit?: number
    includeSpam?: boolean
  }
): Promise<{ nfts: NFT[]; hasMore: boolean; totalBeforeFilter?: number; spamFiltered?: number }> {
  const { page = 1, limit = 1000, includeSpam = false } = options || {}

  if (!HELIUS_RPC_URL) {
    return { nfts: [], hasMore: false }
  }

  try {
    logger.debug(`Fetching NFTs for wallet: ${walletAddress}, page: ${page}`)

    // Paginate through all Helius pages to get complete NFT collection
    const allAssets: any[] = []
    let heliusPage = 1
    const heliusPageSize = 1000 // Max per Helius DAS request

    while (true) {
      const response = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'nft-fetch',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: walletAddress,
            page: heliusPage,
            limit: heliusPageSize,
            displayOptions: {
              showFungible: false,
              showInscription: false,
              showUnverifiedCollections: true,
            },
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        logger.error('Helius RPC error:', data.error || data)
        break
      }

      const items = data.result?.items || []
      allAssets.push(...items)

      logger.debug(`Helius page ${heliusPage}: got ${items.length} assets (total so far: ${allAssets.length})`)

      // If we got fewer than the page size, we've reached the end
      if (items.length < heliusPageSize) break
      heliusPage++

      // Safety cap to prevent infinite loops
      if (heliusPage > 10) break
    }

    logger.debug(`Found ${allAssets.length} total assets for wallet`)

    // Transform all assets
    const transformedAssets = allAssets
      .map((item: any) => {
        // Prefer CDN URLs for faster loading
        let imageUrl =
          item.content?.files?.[0]?.cdn_uri ||  // CDN first (fastest)
          item.content?.links?.image ||
          item.content?.files?.[0]?.uri ||
          ''

        // Fix double slash issue in Helius CDN URLs
        if (imageUrl && imageUrl.includes('cdn.helius-rpc.com/cdn-cgi/image//')) {
          // Use the original image URL instead of broken CDN URL
          imageUrl = item.content?.links?.image || item.content?.files?.[0]?.uri || ''
        }

        // Handle empty name by using collection name or symbol as fallback
        const nftName = item.content?.metadata?.name && item.content.metadata.name.trim() !== ''
          ? item.content.metadata.name
          : item.grouping?.[0]?.collection_metadata?.name ||
            item.content?.metadata?.symbol ||
            'NFT';

        return {
          name: nftName,
          symbol: item.content?.metadata?.symbol || 'NFT',
          uri: item.content?.json_uri || '',
          image: imageUrl,
          mint: item.id || '',
          updateAuthority: item.authorities?.[0]?.address,
          collection: item.grouping?.[0] ? {
            name: item.grouping[0].collection_metadata?.name || item.grouping[0].group_value,
            family: item.grouping[0].group_key
          } : undefined,
          // Keep raw data for spam detection
          content: item.content,
          compression: item.compression,
          interface: item.interface
        }
      })
    
    
    const totalBeforeFilter = transformedAssets.length

    // Filter spam if requested (pass the transformed NFT objects)
    const filtered = includeSpam ? transformedAssets : transformedAssets.filter((nft: any) => {
      const isSpam = isSpamNFT(nft)
      if (isSpam) {
        logger.debug(`[SPAM FILTER] Filtering out: ${nft.name} (${nft.mint.substring(0, 8)}...)`)
      }
      return !isSpam
    })
    const spamFiltered = totalBeforeFilter - filtered.length

    logger.info(`✅ NFT Filtering Results: Total=${totalBeforeFilter}, Spam Filtered=${spamFiltered}, Clean=${filtered.length}`)
    
    // Paginate the already-transformed assets
    const startIndex = (page - 1) * limit
    const paginatedAssets = filtered.slice(startIndex, startIndex + limit)
    
    // The assets are already transformed, just use them directly
    const nfts: NFT[] = paginatedAssets
    
    logger.debug(`Returning ${nfts.length} NFTs (page ${page})`)
    return {
      nfts,
      hasMore: filtered.length > startIndex + limit,
      totalBeforeFilter,
      spamFiltered
    }
  } catch (error) {
    logger.error('Error fetching NFTs:', error)
    return { nfts: [], hasMore: false }
  }
}

/**
 * Get a specific NFT by mint address
 */
export async function getNFTByMint(mintAddress: string): Promise<NFT | null> {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'nft-get',
        method: 'getAsset',
        params: {
          id: mintAddress,
          displayOptions: {
            showFungible: false,
          },
        },
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok || data.error || !data.result) {
      return null
    }
    
    const item = data.result
    
    const imageUrl = 
      item.content?.links?.image || 
      item.content?.files?.[0]?.cdn_uri ||
      item.content?.files?.[0]?.uri || 
      ''
    
    return {
      name: item.content?.metadata?.name || 'Unknown NFT',
      symbol: item.content?.metadata?.symbol || 'NFT',
      uri: item.content?.json_uri || '',
      image: imageUrl,
      mint: item.id || mintAddress,
      updateAuthority: item.authorities?.[0]?.address,
      collection: item.grouping?.[0] ? {
        name: item.grouping[0].collection_metadata?.name || item.grouping[0].group_value,
        family: item.grouping[0].group_key
      } : undefined
    }
  } catch (error) {
    logger.error('Error fetching NFT by mint:', error)
    return null
  }
}