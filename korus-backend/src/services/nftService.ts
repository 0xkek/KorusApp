import { Connection } from '@solana/web3.js'

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
if (!HELIUS_API_KEY) {
  console.warn('HELIUS_API_KEY not configured - NFT fetching may be limited')
}
const HELIUS_RPC_URL = HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : ''

// Spam detection patterns
const SPAM_PATTERNS = [
  /^(test|demo|sample|example)/i,
  /^\d+$/, // Just numbers
  /^#\d+$/, // Just #numbers
  /^NFT\s*#?\d+$/i, // Generic "NFT #123"
  /^(mint|token|asset)\s*#?\d+$/i,
  /airdrop/i,
  /claim/i,
  /free\s*mint/i,
  /^untitled/i,
  /^unnamed/i,
]

// Known verified collections
const VERIFIED_COLLECTIONS = [
  'DeGods',
  'y00ts',
  'Okay Bears',
  'Mad Lads',
  'Claynosaurz',
  'SMB',
  'Famous Fox Federation',
  'Tensorians',
  'Bored Ape Solana',
]

function isSpamNFT(nft: any): boolean {
  const name = nft.content?.metadata?.name || ''
  const collectionName = nft.grouping?.[0]?.collection_metadata?.name || ''
  
  // Check if verified collection
  if (VERIFIED_COLLECTIONS.some(vc => 
    collectionName.toLowerCase().includes(vc.toLowerCase())
  )) {
    return false
  }
  
  // Check spam patterns
  if (SPAM_PATTERNS.some(pattern => pattern.test(name))) {
    return true
  }
  
  // Check for missing metadata
  if (!name || name === 'Unknown NFT' || !nft.content?.links?.image) {
    return true
  }
  
  return false
}

/**
 * Fetch NFTs owned by a wallet using Helius DAS API
 */
export async function fetchNFTsForWallet(
  walletAddress: string,
  options?: {
    page?: number
    limit?: number
    includeSpam?: boolean
  }
): Promise<{ nfts: NFT[]; hasMore: boolean; totalBeforeFilter?: number; spamFiltered?: number }> {
  const { page = 1, limit = 20, includeSpam = false } = options || {}
  
  if (!HELIUS_RPC_URL) {
    return { nfts: [], hasMore: false }
  }
  
  try {
    console.log(`Fetching NFTs for wallet: ${walletAddress}, page: ${page}`)
    
    // Use Helius DAS API for better performance
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
          page: 1,
          limit: 200, // Get more to filter spam
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
            showInscription: false,
            showUnverifiedCollections: true,
          },
        },
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok || data.error) {
      console.error('Helius RPC error:', data.error || data)
      return { nfts: [], hasMore: false }
    }
    
    const assets = data.result?.items || []
    console.log(`Found ${assets.length} assets for wallet`)
    
    // Filter out items without images
    const assetsWithImages = assets
      .filter((item: any) => {
        // Only include items with images
        return item.content?.links?.image || 
               item.content?.files?.[0]?.uri ||
               item.content?.files?.[0]?.cdn_uri
      })
      .map((item: any) => {
        // Get the best available image URL
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
          mint: item.id || '',
          updateAuthority: item.authorities?.[0]?.address,
          collection: item.grouping?.[0] ? {
            name: item.grouping[0].collection_metadata?.name || item.grouping[0].group_value,
            family: item.grouping[0].group_key
          } : undefined
        }
      })
    
    
    const totalBeforeFilter = assetsWithImages.length
    
    // Filter spam if requested
    const filtered = includeSpam ? assetsWithImages : assetsWithImages.filter(item => !isSpamNFT(item))
    const spamFiltered = totalBeforeFilter - filtered.length
    
    console.log(`Found ${totalBeforeFilter} NFTs, filtered ${spamFiltered} spam`)
    
    // Transform to NFT format and paginate
    const startIndex = (page - 1) * limit
    const paginatedAssets = filtered.slice(startIndex, startIndex + limit)
    
    const nfts: NFT[] = paginatedAssets.map((item: any) => {
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
        mint: item.id || '',
        updateAuthority: item.authorities?.[0]?.address,
        collection: item.grouping?.[0] ? {
          name: item.grouping[0].collection_metadata?.name || item.grouping[0].group_value,
          family: item.grouping[0].group_key
        } : undefined
      }
    })
    
    console.log(`Returning ${nfts.length} NFTs (page ${page})`)
    return {
      nfts,
      hasMore: filtered.length > startIndex + limit,
      totalBeforeFilter,
      spamFiltered
    }
  } catch (error) {
    console.error('Error fetching NFTs:', error)
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
    console.error('Error fetching NFT by mint:', error)
    return null
  }
}