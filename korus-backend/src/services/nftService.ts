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
// Fallback to the hardcoded key if env var is not set (for now)
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '3d27295a-caf5-4a92-9fee-b52aa43e54bd'
if (!process.env.HELIUS_API_KEY) {
  console.warn('HELIUS_API_KEY not in env, using fallback key')
}
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`

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
  // Handle both raw API data and transformed NFT objects
  const name = nft.content?.metadata?.name || nft.name || ''
  const collectionName = nft.grouping?.[0]?.collection_metadata?.name || nft.collection?.name || ''
  
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
  
  // Check for missing metadata (but be less strict about images)
  if (!name || name === 'Unknown NFT') {
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
    console.log(`Using Helius RPC URL: ${HELIUS_RPC_URL.substring(0, 50)}...`)
    
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
    
    // Log first asset structure for debugging
    if (assets.length > 0) {
      console.log('First asset structure:', JSON.stringify({
        id: assets[0].id,
        name: assets[0].content?.metadata?.name,
        image: assets[0].content?.links?.image,
        files: assets[0].content?.files?.length,
        collection: assets[0].grouping?.[0]?.collection_metadata?.name
      }, null, 2))
    }
    
    // Transform all assets (don't filter by image availability yet)
    const transformedAssets = assets
      .map((item: any) => {
        // Get the best available image URL
        const imageUrl = 
          item.content?.links?.image || 
          item.content?.files?.[0]?.cdn_uri ||
          item.content?.files?.[0]?.uri || 
          ''
        
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
          } : undefined
        }
      })
    
    
    const totalBeforeFilter = transformedAssets.length
    
    // Filter spam if requested (pass the transformed NFT objects)
    const filtered = includeSpam ? transformedAssets : transformedAssets.filter((nft: any) => !isSpamNFT(nft))
    const spamFiltered = totalBeforeFilter - filtered.length
    
    console.log(`Found ${totalBeforeFilter} NFTs, filtered ${spamFiltered} spam`)
    
    // Paginate the already-transformed assets
    const startIndex = (page - 1) * limit
    const paginatedAssets = filtered.slice(startIndex, startIndex + limit)
    
    // The assets are already transformed, just use them directly
    const nfts: NFT[] = paginatedAssets
    
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