/**
 * Performance utilities for the Korus app
 * Includes memoization, debouncing, and optimistic UI helpers
 */

/**
 * Debounce function calls to reduce expensive operations
 * Usage: const debouncedSearch = debounce(handleSearch, 300);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls to limit execution frequency
 * Usage: const throttledScroll = throttle(handleScroll, 100);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Optimistic update helper
 * Immediately updates UI, then reverts if API call fails
 */
export async function withOptimisticUpdate<T>(
  optimisticUpdate: () => void,
  apiCall: () => Promise<T>,
  onError: () => void
): Promise<T | null> {
  // Apply optimistic update immediately
  optimisticUpdate();

  try {
    // Perform actual API call
    const result = await apiCall();
    return result;
  } catch (error) {
    // Revert optimistic update on error
    onError();
    throw error;
  }
}

/**
 * Lazy load a component with loading state
 * Usage: const LazyModal = lazyLoadComponent(() => import('./Modal'));
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc);
}

/**
 * Check if value has changed (for React.memo comparison)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

// Need to import React for lazy loading
import React from 'react';
