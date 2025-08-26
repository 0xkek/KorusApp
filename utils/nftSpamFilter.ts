import { NFT } from './nft';

// Known spam NFT patterns and collections
const SPAM_PATTERNS = {
  // Common spam name patterns
  namePatterns: [
    /^FREE\s+MINT/i,
    /^AIRDROP/i,
    /^Claim\s+\d+/i,
    /^Your\s+reward/i,
    /^Congratulations/i,
    /^You\s+won/i,
    /^Mystery\s+Box/i,
    /^Random\s+NFT/i,
    /^\$\d+\s+(USDC|USDT|SOL)/i,
    /^https?:\/\//i, // URLs in name
    /^www\./i,
    /\.(com|org|net|io)/i, // Domain names
    /^Test\s+NFT/i,
    /^Untitled/i,
    /^Unknown/i,
    /^#\d+$/i, // Just numbers
  ],
  
  // Suspicious update authorities (known spam minters)
  spamAuthorities: [
    'GNfbQEQRSbCqSgn5en3vVwmK5mEqNhTLLea4MPypdwU5', // Example spam authority
    // Add more known spam authorities here
  ],
  
  // Suspicious collection patterns
  suspiciousCollections: [
    'Solana Phone NFT',
    'SolanaMobileNFT',
    'Free Mint Collection',
  ],
  
  // Minimum value thresholds
  minCreatorCount: 0, // NFTs with 0 creators are often spam
  
  // URLs that indicate spam
  spamUrls: [
    'arweave.net/undefined',
    'ipfs://undefined',
    'https://nft.storage',
  ]
};

// Verified collections that should always be shown
const VERIFIED_COLLECTIONS = [
  'DeGods',
  'Okay Bears',
  'Solana Monkey Business',
  'Aurory',
  'Degenerate Ape Academy',
  'Catalina Whale Mixer',
  'Pesky Penguins',
  'Shadowy Super Coder',
  'Thugbirdz',
  'Cets on Creck',
  'Trippin\' Ape Tribe',
  'Famous Fox Federation',
  'y00ts',
  'ABC',
  'Mad Lads',
  'Claynosaurz',
  'Jelly Rascals',
  // Add more verified collections
];

export interface NFTFilterResult {
  isSpam: boolean;
  confidence: number; // 0-100
  reasons: string[];
}

export function analyzeNFT(nft: NFT): NFTFilterResult {
  const reasons: string[] = [];
  let spamScore = 0;
  
  // Check if it's a verified collection (automatic pass)
  if (nft.collection?.name && VERIFIED_COLLECTIONS.some(vc => 
    nft.collection!.name.toLowerCase().includes(vc.toLowerCase())
  )) {
    return { isSpam: false, confidence: 0, reasons: ['Verified collection'] };
  }
  
  // 1. Check name patterns
  for (const pattern of SPAM_PATTERNS.namePatterns) {
    if (pattern.test(nft.name)) {
      spamScore += 30;
      reasons.push(`Suspicious name pattern: ${pattern.source}`);
      break;
    }
  }
  
  // 2. Check for missing or suspicious metadata
  if (!nft.name || nft.name.trim() === '') {
    spamScore += 40;
    reasons.push('Missing NFT name');
  }
  
  if (!nft.image || nft.image === '' || SPAM_PATTERNS.spamUrls.some(url => nft.image?.includes(url))) {
    spamScore += 25;
    reasons.push('Missing or invalid image');
  }
  
  // 3. Check update authority
  if (nft.updateAuthority && SPAM_PATTERNS.spamAuthorities.includes(nft.updateAuthority)) {
    spamScore += 50;
    reasons.push('Known spam minter');
  }
  
  // 4. Check collection name
  if (nft.collection?.name) {
    const collectionName = nft.collection.name;
    
    // Check against suspicious collections
    if (SPAM_PATTERNS.suspiciousCollections.some(sc => 
      collectionName.toLowerCase().includes(sc.toLowerCase())
    )) {
      spamScore += 35;
      reasons.push('Suspicious collection');
    }
    
    // Check for URL in collection name
    if (/https?:\/\/|www\./i.test(collectionName)) {
      spamScore += 40;
      reasons.push('URL in collection name');
    }
  }
  
  // 5. Check symbol
  if (!nft.symbol || nft.symbol.length > 10) {
    spamScore += 15;
    reasons.push('Invalid or missing symbol');
  }
  
  // 6. Check for repetitive/generated names
  if (/^(NFT|Token|Item)\s*#?\d+$/i.test(nft.name)) {
    spamScore += 25;
    reasons.push('Generic generated name');
  }
  
  // 7. Check mint address format (very short = suspicious)
  if (nft.mint && nft.mint.length < 20) {
    spamScore += 20;
    reasons.push('Suspicious mint address');
  }
  
  // Calculate confidence based on spam score
  const confidence = Math.min(spamScore, 100);
  
  // Consider it spam if confidence > 50
  return {
    isSpam: confidence > 50,
    confidence,
    reasons
  };
}

export function filterSpamNFTs(nfts: NFT[], options?: {
  showPotentialSpam?: boolean;
  confidenceThreshold?: number;
  maxResults?: number;
}): NFT[] {
  const {
    showPotentialSpam = false,
    confidenceThreshold = 50,
    maxResults = 100
  } = options || {};
  
  const filtered = nfts.filter(nft => {
    const analysis = analyzeNFT(nft);
    
    // If showing potential spam, include low confidence spam
    if (showPotentialSpam) {
      return analysis.confidence < 80; // Still filter very obvious spam
    }
    
    // Otherwise use the confidence threshold
    return !analysis.isSpam || analysis.confidence < confidenceThreshold;
  });
  
  // Sort by quality (verified collections first, then by name)
  const sorted = filtered.sort((a, b) => {
    // Verified collections first
    const aVerified = a.collection?.name && VERIFIED_COLLECTIONS.some(vc => 
      a.collection!.name.toLowerCase().includes(vc.toLowerCase())
    );
    const bVerified = b.collection?.name && VERIFIED_COLLECTIONS.some(vc => 
      b.collection!.name.toLowerCase().includes(vc.toLowerCase())
    );
    
    if (aVerified && !bVerified) return -1;
    if (!aVerified && bVerified) return 1;
    
    // Then sort by name
    return a.name.localeCompare(b.name);
  });
  
  // Limit results if specified
  return maxResults ? sorted.slice(0, maxResults) : sorted;
}

// Get spam statistics for debugging
export function getSpamStats(nfts: NFT[]): {
  total: number;
  spam: number;
  clean: number;
  spamPercentage: number;
  topSpamReasons: { [key: string]: number };
} {
  const stats = {
    total: nfts.length,
    spam: 0,
    clean: 0,
    spamPercentage: 0,
    topSpamReasons: {} as { [key: string]: number }
  };
  
  for (const nft of nfts) {
    const analysis = analyzeNFT(nft);
    if (analysis.isSpam) {
      stats.spam++;
      for (const reason of analysis.reasons) {
        stats.topSpamReasons[reason] = (stats.topSpamReasons[reason] || 0) + 1;
      }
    } else {
      stats.clean++;
    }
  }
  
  stats.spamPercentage = stats.total > 0 ? (stats.spam / stats.total) * 100 : 0;
  
  return stats;
}