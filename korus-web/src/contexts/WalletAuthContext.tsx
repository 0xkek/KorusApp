'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useWalletAuth as useWalletAuthHook } from '@/hooks/useWalletAuth';

interface WalletAuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
  logout: () => void;
}

const WalletAuthContext = createContext<WalletAuthContextType | undefined>(undefined);

export function WalletAuthProvider({ children }: { children: ReactNode }) {
  const authState = useWalletAuthHook();

  return (
    <WalletAuthContext.Provider value={authState}>
      {children}
    </WalletAuthContext.Provider>
  );
}

export function useWalletAuth() {
  const context = useContext(WalletAuthContext);
  if (context === undefined) {
    throw new Error('useWalletAuth must be used within a WalletAuthProvider');
  }
  return context;
}
