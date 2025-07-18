// SNS (Solana Name Service) utilities
// In production, these would call a backend API to resolve SNS domains

export interface SNSDomain {
  domain: string;
  owner: string;
  favorite?: boolean;
}

// Mock SNS domains for development
const MOCK_SNS_DOMAINS: { [walletAddress: string]: SNSDomain[] } = {
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': [
    { domain: 'shadowy.sol', owner: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', favorite: true },
    { domain: 'supercode.sol', owner: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
    { domain: 'developer.sol', owner: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' }
  ],
  'GKJRSuAqFatpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe': [
    { domain: 'defi.sol', owner: 'GKJRSuAqFatpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe', favorite: true }
  ],
  'E7r83mAKJRSuAZFatpGpNcBdK3dQkTDddt5p5uUYqwY': [
    { domain: 'moonshot.sol', owner: 'E7r83mAKJRSuAZFatpGpNcBdK3dQkTDddt5p5uUYqwY', favorite: true },
    { domain: 'trader.sol', owner: 'E7r83mAKJRSuAZFatpGpNcBdK3dQkTDddt5p5uUYqwY' },
    { domain: 'nft.sol', owner: 'E7r83mAKJRSuAZFatpGpNcBdK3dQkTDddt5p5uUYqwY' }
  ],
  'B9r3dQkTDddt5p5uUYqGKJRSuAZFatpGpNcmAKwYE7r8': [
    { domain: 'ape.sol', owner: 'B9r3dQkTDddt5p5uUYqGKJRSuAZFatpGpNcmAKwYE7r8', favorite: true }
  ],
  '5p5uUYqGKJRSuAZFatpGpNcmAKwYE7r8B9r3dQkTDddt': [
    { domain: 'wagmi.sol', owner: '5p5uUYqGKJRSuAZFatpGpNcmAKwYE7r8B9r3dQkTDddt', favorite: true }
  ],
  'BKJRSuAqF8tpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe': [
    { domain: 'korus.sol', owner: 'BKJRSuAqF8tpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe', favorite: true },
    { domain: 'builder.sol', owner: 'BKJRSuAqF8tpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe' }
  ],
  'CKdR8mBvH9tgLpQeN4eSkVHgfr6k6pVxZfO3syhZaSDt': [
    { domain: 'solana.sol', owner: 'CKdR8mBvH9tgLpQeN4eSkVHgfr6k6pVxZfO3syhZaSDt', favorite: true },
    { domain: 'tutorial.sol', owner: 'CKdR8mBvH9tgLpQeN4eSkVHgfr6k6pVxZfO3syhZaSDt' }
  ]
};

// Default domains for any wallet not in the mock data
const DEFAULT_USER_DOMAINS: SNSDomain[] = [
  { domain: 'anonymous.sol', owner: '', favorite: true },
  { domain: 'user.sol', owner: '' },
  { domain: 'newbie.sol', owner: '' }
];

// Cache for resolved domains
const snsCache: Map<string, { domains: SNSDomain[], timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all SNS domains owned by a wallet address
 */
export async function fetchSNSDomains(walletAddress: string): Promise<SNSDomain[]> {
  try {
    // Check cache first
    const cached = snsCache.get(walletAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.domains;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For development, return mock domains
    let domains = MOCK_SNS_DOMAINS[walletAddress];
    
    // If no specific domains for this wallet, use default domains
    if (!domains || domains.length === 0) {
      domains = DEFAULT_USER_DOMAINS.map(d => ({
        ...d,
        owner: walletAddress
      }));
    }
    
    // In production, this would be:
    // const response = await fetch(`${API_URL}/sns/domains/${walletAddress}`);
    // const domains = await response.json();

    // Cache the result
    snsCache.set(walletAddress, { domains, timestamp: Date.now() });
    
    return domains;
  } catch (error) {
    console.error('Error fetching SNS domains:', error);
    return [];
  }
}

/**
 * Get the favorite/primary SNS domain for a wallet
 */
export async function getFavoriteSNSDomain(walletAddress: string): Promise<string | null> {
  try {
    const domains = await fetchSNSDomains(walletAddress);
    
    // Find the favorite domain
    const favorite = domains.find(d => d.favorite);
    if (favorite) return favorite.domain;
    
    // If no favorite, return the first domain
    if (domains.length > 0) return domains[0].domain;
    
    return null;
  } catch (error) {
    console.error('Error getting favorite SNS domain:', error);
    return null;
  }
}

/**
 * Resolve a .sol domain to a wallet address
 */
export async function resolveSNSDomain(domain: string): Promise<string | null> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // For development, reverse lookup from our mock data
    for (const [wallet, domains] of Object.entries(MOCK_SNS_DOMAINS)) {
      if (domains.some(d => d.domain === domain)) {
        return wallet;
      }
    }
    
    // In production:
    // const response = await fetch(`${API_URL}/sns/resolve/${domain}`);
    // const { owner } = await response.json();
    // return owner;
    
    return null;
  } catch (error) {
    console.error('Error resolving SNS domain:', error);
    return null;
  }
}

/**
 * Format display name with SNS domain fallback to truncated address
 */
export function formatDisplayName(domain: string | null, address: string): string {
  if (domain) return domain;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Check if a string is a valid .sol domain
 */
export function isValidSNSDomain(domain: string): boolean {
  return domain.endsWith('.sol') && domain.length > 4;
}