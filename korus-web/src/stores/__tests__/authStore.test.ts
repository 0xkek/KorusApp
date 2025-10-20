/**
 * Tests for Authentication Store
 * Tests the Zustand auth store that manages authentication state
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const { clearAuth } = useAuthStore.getState();
    clearAuth();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastAuthTime).toBeNull();
      expect(result.current.hasAttemptedAuth).toBe(false);
    });
  });

  describe('setToken', () => {
    it('should set token and mark as authenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setToken('test-token-123');
      });

      expect(result.current.token).toBe('test-token-123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should clear authentication when token is null', () => {
      const { result } = renderHook(() => useAuthStore());

      // First set a token
      act(() => {
        result.current.setToken('test-token');
      });

      // Then clear it
      act(() => {
        result.current.setToken(null);
      });

      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('setAuthenticating', () => {
    it('should update authenticating state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuthenticating(true);
      });

      expect(result.current.isAuthenticating).toBe(true);

      act(() => {
        result.current.setAuthenticating(false);
      });

      expect(result.current.isAuthenticating).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and stop authenticating', () => {
      const { result } = renderHook(() => useAuthStore());

      // First start authenticating
      act(() => {
        result.current.setAuthenticating(true);
      });

      // Then set an error
      act(() => {
        result.current.setError('Authentication failed');
      });

      expect(result.current.error).toBe('Authentication failed');
      expect(result.current.isAuthenticating).toBe(false);
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setError('Error message');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setLastAuthTime', () => {
    it('should update last auth time', () => {
      const { result } = renderHook(() => useAuthStore());
      const timestamp = Date.now();

      act(() => {
        result.current.setLastAuthTime(timestamp);
      });

      expect(result.current.lastAuthTime).toBe(timestamp);
    });
  });

  describe('setHasAttemptedAuth', () => {
    it('should update hasAttemptedAuth flag', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setHasAttemptedAuth(true);
      });

      expect(result.current.hasAttemptedAuth).toBe(true);

      act(() => {
        result.current.setHasAttemptedAuth(false);
      });

      expect(result.current.hasAttemptedAuth).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should reset all auth state to initial values', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set various states
      act(() => {
        result.current.setToken('test-token');
        result.current.setAuthenticating(true);
        result.current.setError('Some error');
        result.current.setLastAuthTime(Date.now());
        result.current.setHasAttemptedAuth(true);
      });

      // Clear everything
      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastAuthTime).toBeNull();
      expect(result.current.hasAttemptedAuth).toBe(false);
    });
  });

  describe('canAttemptAuth', () => {
    it('should allow first auth attempt', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.canAttemptAuth()).toBe(true);
    });

    it('should prevent auth when already authenticating', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuthenticating(true);
      });

      expect(result.current.canAttemptAuth()).toBe(false);
    });

    it('should prevent auth when attempted but not completed', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setHasAttemptedAuth(true);
      });

      // No lastAuthTime means auth is in progress
      expect(result.current.canAttemptAuth()).toBe(false);
    });

    it('should prevent auth during cooldown period', () => {
      const { result } = renderHook(() => useAuthStore());
      const recentTime = Date.now() - 2000; // 2 seconds ago

      act(() => {
        result.current.setHasAttemptedAuth(true);
        result.current.setLastAuthTime(recentTime);
      });

      // Should still be in 5-second cooldown
      expect(result.current.canAttemptAuth()).toBe(false);
    });

    it('should allow auth after cooldown period', () => {
      const { result } = renderHook(() => useAuthStore());
      const oldTime = Date.now() - 6000; // 6 seconds ago (past 5s cooldown)

      act(() => {
        result.current.setHasAttemptedAuth(true);
        result.current.setLastAuthTime(oldTime);
      });

      // Cooldown passed, should allow retry
      expect(result.current.canAttemptAuth()).toBe(true);
    });
  });

  describe('Auth Flow Integration', () => {
    it('should handle complete successful auth flow', () => {
      const { result } = renderHook(() => useAuthStore());
      const timestamp = Date.now();

      // Start auth
      act(() => {
        result.current.setHasAttemptedAuth(true);
        result.current.setAuthenticating(true);
      });

      expect(result.current.isAuthenticating).toBe(true);
      expect(result.current.canAttemptAuth()).toBe(false);

      // Complete auth successfully
      act(() => {
        result.current.setToken('auth-token-xyz');
        result.current.setLastAuthTime(timestamp);
      });

      expect(result.current.token).toBe('auth-token-xyz');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.lastAuthTime).toBe(timestamp);
    });

    it('should handle failed auth flow', () => {
      const { result } = renderHook(() => useAuthStore());

      // Start auth
      act(() => {
        result.current.setHasAttemptedAuth(true);
        result.current.setAuthenticating(true);
      });

      // Fail auth
      act(() => {
        result.current.setError('Wallet signature rejected');
      });

      expect(result.current.error).toBe('Wallet signature rejected');
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle logout flow', () => {
      const { result } = renderHook(() => useAuthStore());

      // First authenticate
      act(() => {
        result.current.setToken('test-token');
        result.current.setLastAuthTime(Date.now());
        result.current.setHasAttemptedAuth(true);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.hasAttemptedAuth).toBe(false);
    });
  });

  describe('Race Condition Prevention (Critical Bug Fix)', () => {
    it('should synchronously set hasAttemptedAuth to prevent double auth', () => {
      // This tests the fix for the auth loop bug
      const store = useAuthStore.getState();

      // Initial state
      expect(store.hasAttemptedAuth).toBe(false);
      expect(store.canAttemptAuth()).toBe(true);

      // Synchronously set flag
      store.setHasAttemptedAuth(true);

      // Immediately check - should see updated value
      const updatedStore = useAuthStore.getState();
      expect(updatedStore.hasAttemptedAuth).toBe(true);
      expect(updatedStore.canAttemptAuth()).toBe(false);
    });

    it('should prevent multiple concurrent auth attempts', () => {
      const store = useAuthStore.getState();

      // First attempt sets flag synchronously
      store.setHasAttemptedAuth(true);

      // Second attempt (e.g., from React StrictMode double render) should be blocked
      expect(useAuthStore.getState().canAttemptAuth()).toBe(false);
    });
  });
});
