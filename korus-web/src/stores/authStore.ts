/**
 * Authentication Store
 * Centralized authentication state management using Zustand
 * Replaces global state anti-pattern with proper React state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: string | null;
  lastAuthTime: number | null;
  hasAttemptedAuth: boolean;
}

interface AuthActions {
  setToken: (token: string | null) => void;
  setAuthenticating: (isAuthenticating: boolean) => void;
  setError: (error: string | null) => void;
  setLastAuthTime: (time: number | null) => void;
  setHasAttemptedAuth: (hasAttempted: boolean) => void;
  clearAuth: () => void;
  canAttemptAuth: () => boolean;
}

type AuthStore = AuthState & AuthActions;

const AUTH_COOLDOWN_MS = 5000;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      token: null,
      isAuthenticated: false,
      isAuthenticating: false,
      error: null,
      lastAuthTime: null,
      hasAttemptedAuth: false,

      // Actions
      setToken: (token) => {
        set({
          token,
          isAuthenticated: !!token,
          error: null,
        });
      },

      setAuthenticating: (isAuthenticating) => {
        set({ isAuthenticating });
      },

      setError: (error) => {
        set({
          error,
          isAuthenticating: false,
        });
      },

      setLastAuthTime: (time) => {
        set({ lastAuthTime: time });
      },

      setHasAttemptedAuth: (hasAttempted) => {
        set({ hasAttemptedAuth: hasAttempted });
      },

      clearAuth: () => {
        set({
          token: null,
          isAuthenticated: false,
          isAuthenticating: false,
          error: null,
          lastAuthTime: null,
          hasAttemptedAuth: false,
        });
      },

      canAttemptAuth: () => {
        const { isAuthenticating, lastAuthTime, hasAttemptedAuth } = get();

        // Prevent if already authenticating
        if (isAuthenticating) {
          return false;
        }

        // Prevent if already attempted in this session (protects against double-render)
        if (hasAttemptedAuth && !lastAuthTime) {
          // Auth is in progress but not completed yet
          return false;
        }

        // Check cooldown after a completed auth
        if (lastAuthTime) {
          const timeSinceLastAuth = Date.now() - lastAuthTime;
          if (timeSinceLastAuth < AUTH_COOLDOWN_MS) {
            return false;
          }
          // If cooldown passed, allow retry
          return true;
        }

        // First attempt - allow it
        return !hasAttemptedAuth;
      },
    }),
    {
      name: 'korus-auth-storage',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
