import { logger } from '@/utils/logger';
// SNS (Solana Name Service) utilities for web app
// Adapted from mobile app implementation

export interface SNSDomain {
  domain: string;
  owner: string;
  favorite?: boolean;
}

// Mock SNS domains removed - only show real domains from the blockchain

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

    // Get API URL from environment or use default
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) {
      if (process.env.NODE_ENV === 'development') {
        logger.log('No API URL configured, using mock SNS domains');
      }
    } else {
      try {
        // Try to fetch real SNS domains from our backend
        const response = await fetch(`${API_URL}/api/sns/domains/${walletAddress}`);

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.domains && data.domains.length > 0) {
            // Cache and return real domains
            snsCache.set(walletAddress, { domains: data.domains, timestamp: Date.now() });
            return data.domains;
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.log('SNS API call failed, using fallback:', error);
        }
      }
    }

    // Return empty array if no real domains found
    // Don't use mock data - only show actual SNS domains owned by the user
    snsCache.set(walletAddress, { domains: [], timestamp: Date.now() });

    return [];
  } catch (error) {
    logger.error('Error fetching SNS domains:', error);
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
    logger.error('Error getting favorite SNS domain:', error);
    return null;
  }
}

/**
 * Set a favorite SNS domain for a wallet
 */
export async function setFavoriteSNSDomain(walletAddress: string, domain: string): Promise<boolean> {
  try {
    const domains = await fetchSNSDomains(walletAddress);

    // Update the favorite status
    const updatedDomains = domains.map(d => ({
      ...d,
      favorite: d.domain === domain
    }));

    // Update cache
    snsCache.set(walletAddress, { domains: updatedDomains, timestamp: Date.now() });

    // Send to backend API - but we don't need this since we save via updateProfile
    // The favorite domain is saved via usersAPI.updateProfile({ snsUsername: domain }, token)
    // in the profile page SNS dropdown handler

    return true;
  } catch (error) {
    logger.error('Error setting favorite SNS domain:', error);
    return false;
  }
}

/**
 * Resolve a .sol domain to a wallet address
 */
export async function resolveSNSDomain(domain: string): Promise<string | null> {
  try {
    // Get API URL from environment or use default
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) {
      if (process.env.NODE_ENV === 'development') {
        logger.log('No API URL configured for SNS resolution');
      }
      return null;
    }

    try {
      // Resolve domain using real SNS API
      const response = await fetch(`${API_URL}/api/sns/resolve/${encodeURIComponent(domain)}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.owner) {
          return data.owner;
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.log('SNS resolve API failed:', error);
      }
    }

    return null;
  } catch (error) {
    logger.error('Error resolving SNS domain:', error);
    return null;
  }
}

/**
 * Format display name with SNS domain fallback to truncated address
 */
export function formatDisplayName(domain: string | null, address: string, username?: string | null): string {
  // Priority: SNS domain > username > truncated address
  if (domain) return domain;
  if (username) return username;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Check if a string is a valid .sol domain
 */
export function isValidSNSDomain(domain: string): boolean {
  return domain.endsWith('.sol') && domain.length > 4;
}