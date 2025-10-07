import { useEffect, useState } from 'react';
import { getFavoriteSNSDomain, fetchSNSDomains, SNSDomain } from '../utils/sns';

// Cache for SNS domains to avoid repeated lookups
const domainCache = new Map<string, string | null>();

export function useSNSDomain(walletAddress: string | null) {
  const [domain, setDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress || walletAddress.includes('...')) {
      setDomain(null);
      return;
    }

    // Check cache first
    if (domainCache.has(walletAddress)) {
      const cachedDomain = domainCache.get(walletAddress) || null;
      setDomain(cachedDomain);
      return;
    }

    // Fetch domain
    setLoading(true);
    getFavoriteSNSDomain(walletAddress)
      .then(snsDomain => {
        domainCache.set(walletAddress, snsDomain);
        setDomain(snsDomain);
      })
      .catch(error => {
        domainCache.set(walletAddress, null);
        setDomain(null);
        console.error('Error fetching SNS domain:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [walletAddress]);

  return { domain, loading };
}

// Hook to fetch all SNS domains for dropdown
export function useAllSNSDomains(walletAddress: string | null) {
  const [domains, setDomains] = useState<SNSDomain[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress || walletAddress.includes('...')) {
      setDomains([]);
      return;
    }

    setLoading(true);
    fetchSNSDomains(walletAddress)
      .then(snsDomainsResult => {
        setDomains(snsDomainsResult);
      })
      .catch(error => {
        setDomains([]);
        console.error('Error fetching all SNS domains:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [walletAddress]);

  return { domains, loading };
}

// Helper to format display name with SNS fallback
export function useDisplayName(walletAddress: string, isPremium: boolean = false, username?: string | null) {
  const { domain } = useSNSDomain(walletAddress);

  // Priority order:
  // 1. SNS domain (premium only)
  // 2. Regular username
  // 3. Truncated wallet address

  // Only show SNS domains for premium users
  if (isPremium && domain) return domain;

  // Show username if available
  if (username) return username;

  // Handle null/undefined wallet addresses
  if (!walletAddress) return 'Unknown';

  // For truncated addresses, return as is
  if (walletAddress.includes('...')) return walletAddress;

  // Otherwise truncate
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}