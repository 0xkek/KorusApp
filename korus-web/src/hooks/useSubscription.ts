'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscriptionAPI, SubscriptionStatusResponse } from '@/lib/api';
import { useWalletAuth } from './useWalletAuth';

interface UseSubscriptionReturn {
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  daysUntilExpiration: number | null;
}

/**
 * Hook to manage subscription status
 * Fetches and caches subscription status from backend
 * Auto-refreshes on authentication changes
 */
export function useSubscription(): UseSubscriptionReturn {
  const { token, isAuthenticated } = useWalletAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (forceFresh = false) => {
    if (!token || !isAuthenticated) {
      setSubscriptionStatus(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ALWAYS fetch fresh data from backend - no cache checks
      console.log('🔄 Fetching fresh subscription status from backend...');
      const status = await subscriptionAPI.getStatus(token);
      console.log('📦 Backend subscription status:', status);
      setSubscriptionStatus(status);

      // Cache in localStorage for offline access
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('korus_subscription_status', JSON.stringify(status));
          localStorage.setItem('korus_subscription_cached_at', Date.now().toString());
          console.log('💾 Cached subscription status in localStorage');
        } catch {
          // Continue without cache
        }
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch subscription status:', err);
      setError(err.message || 'Failed to fetch subscription status');

      // Try to load from cache on error
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('korus_subscription_status');
          const cachedAt = localStorage.getItem('korus_subscription_cached_at');

          if (cached && cachedAt) {
            const cacheAge = Date.now() - parseInt(cachedAt);
            // Use cache if less than 5 minutes old
            if (cacheAge < 5 * 60 * 1000) {
              console.log('📂 Using cached subscription status (age:', Math.floor(cacheAge / 1000), 'seconds)');
              setSubscriptionStatus(JSON.parse(cached));
            } else {
              console.log('🗑️ Cache expired, clearing...');
              localStorage.removeItem('korus_subscription_status');
              localStorage.removeItem('korus_subscription_cached_at');
            }
          }
        } catch {
          // Continue without cache
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Clear cache and fetch fresh on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🗑️ Clearing subscription cache on mount...');
      localStorage.removeItem('korus_subscription_status');
      localStorage.removeItem('korus_subscription_cached_at');
    }
  }, []); // Run once on mount

  // Fetch on mount and when auth changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysUntilExpiration = subscriptionStatus?.daysUntilExpiration ?? null;

  return {
    isPremium,
    subscriptionStatus,
    isLoading,
    error,
    refreshStatus: fetchStatus,
    daysUntilExpiration
  };
}
