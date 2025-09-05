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

export async function fetchNFTsFromWallet(
  walletAddress: string,
  options?: {
    page?: number;
    limit?: number;
    includeSpam?: boolean;
  }
): Promise<{ nfts: NFT[]; hasMore: boolean; totalBeforeFilter?: number; spamFiltered?: number }> {
  if (!walletAddress) {
    logger.error('No wallet address provided for NFT fetching');
    return { nfts: [], hasMore: false };
  }
  
  const { page = 1, limit = 20, includeSpam = false } = options || {};

  // Check cache first (cache key includes page and spam filter setting)
  const cacheKey = `${walletAddress}_${page}_${includeSpam}`;
  const cached = nftCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.log('Returning cached NFTs');
    return { nfts: cached.nfts, hasMore: cached.nfts.length === limit };
  }

  try {
    // Get API URL from environment
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    if (!API_URL) {
      throw new Error('EXPO_PUBLIC_API_URL is not configured');
    }
    
    logger.log('Fetching NFTs for wallet:', walletAddress, 'page:', page);
    
    // Fetch from our backend API (which uses Helius internally)
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      includeSpam: includeSpam.toString()
    });
    
    const url = `${API_URL}/nfts/wallet/${walletAddress}?${queryParams}`;
    logger.log('Fetching NFTs from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error('Backend NFT fetch failed:', {
        status: response.status, 
        statusText: response.statusText,
        url: url
      });
      
      // Try to get error details
      try {
        const errorData = await response.json();
        logger.error('Backend error details:', errorData);
      } catch (e) {
        logger.error('Could not parse error response');
      }
      
      return { nfts: [], hasMore: false };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      logger.error('Backend NFT fetch error:', data.error, data.details);
      return { nfts: [], hasMore: false };
    }
    
    // Cache the results
    nftCache[cacheKey] = {
      nfts: data.nfts || [],
      timestamp: Date.now()
    };
    
    logger.log(`Backend returned ${data.nfts?.length || 0} NFTs (page ${page})`);
    
    return {
      nfts: data.nfts || [],
      hasMore: data.hasMore || false,
      totalBeforeFilter: data.totalBeforeFilter,
      spamFiltered: data.spamFiltered
    };
  } catch (error) {
    logger.error('Error fetching NFTs:', error);
    return { nfts: [], hasMore: false };
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