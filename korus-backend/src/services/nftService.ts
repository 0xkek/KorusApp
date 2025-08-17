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
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '3d27295a-caf5-4a92-9fee-b52aa43e54bd'
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`

/**
 * Fetch NFTs owned by a wallet using Helius DAS API
 */
export async function fetchNFTsForWallet(walletAddress: string): Promise<NFT[]> {
  try {
    console.log(`Fetching NFTs for wallet: ${walletAddress}`)
    
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
          limit: 100, // Get up to 100 NFTs
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
      return []
    }
    
    const assets = data.result?.items || []
    console.log(`Found ${assets.length} assets for wallet`)
    
    // Filter and transform to NFT format
    const nfts: NFT[] = assets
      .filter((item: any) => {
        // Only include items with images
        return item.content?.links?.image || 
               item.content?.files?.[0]?.uri ||
               item.content?.files?.[0]?.cdn_uri
      })
      .slice(0, 50) // Limit to 50 NFTs for performance
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
    
    console.log(`Returning ${nfts.length} NFTs with images`)
    return nfts
  } catch (error) {
    console.error('Error fetching NFTs:', error)
    return []
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