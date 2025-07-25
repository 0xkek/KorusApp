import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook that batches state updates to prevent unnecessary re-renders
 * Useful for frequently updated states like scroll positions
 */
export function useOptimizedState<T>(initialValue: T, delay: number = 100) {
  const [state, setState] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<T>(initialValue);

  const setOptimizedState = useCallback((value: T | ((prev: T) => T)) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update pending value
    if (typeof value === 'function') {
      pendingValueRef.current = (value as (prev: T) => T)(pendingValueRef.current);
    } else {
      pendingValueRef.current = value;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setState(pendingValueRef.current);
      timeoutRef.current = null;
    }, delay);
  }, [delay]);

  return [state, setOptimizedState] as const;
}