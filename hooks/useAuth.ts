import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '../context/WalletContext';
import { authAPI, hasAuthToken } from '../utils/api';
import { logger } from '../utils/logger';
import { useKorusAlert } from '../components/KorusAlertProvider';

export function useAuth() {
  const { walletAddress, isLoading: walletLoading, logout } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { showAlert } = useKorusAlert();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [walletAddress]);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      
      // Check if we have a stored token
      const hasToken = await hasAuthToken();
      
      if (hasToken && walletAddress) {
        // Verify token is still valid
        try {
          const profile = await authAPI.getProfile();
          setUser(profile.user);
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, clear it
          logger.warn('Auth token invalid, clearing');
          await authAPI.logout();
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      logger.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const signIn = async (signature: string, message: string) => {
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    try {
      const response = await authAPI.connectWallet(walletAddress, signature, message);
      
      if (response.success && response.token) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        showAlert({
          title: 'Success',
          message: 'Successfully connected!',
          type: 'success'
        });
        
        return response;
      } else {
        throw new Error('Failed to authenticate');
      }
    } catch (error) {
      logger.error('Sign in error:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authAPI.logout();
      await logout();
      setIsAuthenticated(false);
      setUser(null);
      
      showAlert({
        title: 'Success',
        message: 'Successfully disconnected',
        type: 'success'
      });
      
      // Redirect to welcome screen
      router.replace('/welcome');
    } catch (error) {
      logger.error('Sign out error:', error);
      throw error;
    }
  };

  const requireAuth = () => {
    if (!isAuthenticated && !isCheckingAuth) {
      router.replace('/welcome');
      return false;
    }
    return true;
  };

  return {
    isAuthenticated,
    isCheckingAuth,
    isLoading: walletLoading || isCheckingAuth,
    user,
    walletAddress,
    signIn,
    signOut,
    requireAuth,
    checkAuthStatus,
  };
}