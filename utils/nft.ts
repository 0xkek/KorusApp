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

// Mock NFTs for development
const MOCK_NFTS: NFT[] = [
  {
    name: "Cool Ape #1234",
    symbol: "CAPE",
    uri: "https://example.com/metadata/1",
    image: "https://picsum.photos/200/200?random=1",
    mint: "mockMint1",
    collection: { name: "Cool Apes", family: "Apes" }
  },
  {
    name: "Pixel Punk #5678",
    symbol: "PUNK",
    uri: "https://example.com/metadata/2",
    image: "https://picsum.photos/200/200?random=2",
    mint: "mockMint2",
    collection: { name: "Pixel Punks" }
  },
  {
    name: "Space Cat #9012",
    symbol: "SCAT",
    uri: "https://example.com/metadata/3",
    image: "https://picsum.photos/200/200?random=3",
    mint: "mockMint3",
    collection: { name: "Space Cats", family: "Cats" }
  },
  {
    name: "Degen Doge #3456",
    symbol: "DOGE",
    uri: "https://example.com/metadata/4",
    image: "https://picsum.photos/200/200?random=4",
    mint: "mockMint4",
    collection: { name: "Degen Doges" }
  }
];

export async function fetchNFTsFromWallet(walletAddress: string): Promise<NFT[]> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, always return mock NFTs until we resolve the Solana dependency issues
    // In production, this would make an API call to a backend service
    // that handles the Solana blockchain interaction
    
    // Return a random subset of mock NFTs to simulate different wallets
    const randomCount = Math.floor(Math.random() * MOCK_NFTS.length) + 1;
    const shuffled = [...MOCK_NFTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, randomCount);

    /* Production code would look like:
    const response = await fetch(`${API_URL}/nfts/${walletAddress}`);
    const nfts = await response.json();
    return nfts;
    */
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    // Return empty array on error
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