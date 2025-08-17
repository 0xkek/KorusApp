// Temporarily removed Solana imports due to React Native compatibility issues
// import { Connection, PublicKey } from '@solana/web3.js';
// import { Metaplex } from '@metaplex-foundation/js';

export interface NFT {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  mint: string;
  updateAuthority?: string;
  collection?: {
    name: string;
    family?: string;
  };
}

// Simple in-memory cache
const nftCache: { [walletAddress: string]: { nfts: NFT[], timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchNFTsFromWallet(walletAddress: string): Promise<NFT[]> {
  if (!walletAddress) {
    console.error('No wallet address provided for NFT fetching');
    return [];
  }

  // Check cache first
  const cached = nftCache[walletAddress];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached NFTs');
    return cached.nfts;
  }

  try {
    // Get API URL from environment or use default
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    
    console.log('Fetching NFTs for wallet:', walletAddress);
    
    // Try to fetch from our backend first
    try {
      const response = await fetch(`${API_URL}/nfts/wallet/${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.nfts && data.nfts.length > 0) {
          // Cache and return NFTs from our backend
          nftCache[walletAddress] = { nfts: data.nfts, timestamp: Date.now() };
          console.log(`Backend returned ${data.nfts.length} NFTs`);
          return data.nfts;
        }
      }
    } catch (backendError) {
      console.log('Backend NFT fetch failed, trying direct Helius:', backendError);
    }
    
    // Fallback to direct Helius API if backend fails
    const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY;
    if (!HELIUS_API_KEY) {
      console.error('HELIUS_API_KEY not configured - NFT fetching disabled');
      return [];
    }
    
    const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    // Use the DAS API getAssetsByOwner method
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
          limit: 50,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
            showInscription: false,
          },
        },
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      console.error('Helius RPC error:', data.error || data);
      return [];
    }
    
    const assets = data.result?.items || [];
    console.log(`Helius DAS API returned ${assets.length} assets`);
    
    // Transform DAS API response to our NFT format - process in parallel
    const nfts: NFT[] = assets
      .filter((item: any) => {
        // Quick filter - only check for basic image presence
        return item.content?.links?.image || item.content?.files?.[0]?.uri;
      })
      .slice(0, 20) // Limit to first 20 NFTs for performance
      .map((item: any) => {
        // Handle different image URL formats from DAS API
        const imageUrl = item.content?.links?.image || 
                        item.content?.files?.[0]?.uri || 
                        '';
        
        return {
          name: item.content?.metadata?.name || 'Unknown NFT',
          symbol: item.content?.metadata?.symbol || 'NFT',
          uri: item.content?.json_uri || '',
          image: imageUrl,
          mint: item.id || '',
          updateAuthority: item.authorities?.[0]?.address || '',
          collection: item.grouping?.[0] ? {
            name: item.grouping[0].collection_metadata?.name || 'Unknown Collection',
            family: item.grouping[0].collection_metadata?.family
          } : undefined
        };
      });
    
    console.log(`Processed ${nfts.length} NFTs with images`);
    
    // Cache the results
    nftCache[walletAddress] = {
      nfts,
      timestamp: Date.now()
    };
    
    return nfts;
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
}

// Helper to check if a URL is valid and accessible
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}

// Get a fallback image for NFTs without valid images
export function getFallbackNFTImage(nft: NFT): string {
  // Generate a deterministic color based on mint address
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1F2'];
  const colorIndex = nft.mint.charCodeAt(0) % colors.length;
  
  // Return a data URI for a colored placeholder
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${colors[colorIndex]}"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="60" font-family="Arial">
        ${nft.symbol.slice(0, 2).toUpperCase()}
      </text>
    </svg>
  `)}`;
}