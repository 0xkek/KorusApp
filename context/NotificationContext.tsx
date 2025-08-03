import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';
import { useWallet } from './WalletContext';
import { logger } from '../utils/logger';
import { AuthService } from '../services/auth';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { walletAddress } = useWallet();

  const refreshUnreadCount = useCallback(async () => {
    if (!walletAddress) {
      setUnreadCount(0);
      return;
    }

    // Make sure we have a valid auth token before making the request
    if (!AuthService.getToken()) {
      logger.log('No auth token available yet, skipping notification fetch');
      return;
    }

    try {
      const response = await ApiService.notifications.getAll();
      if (response && response.notifications) {
        const unread = response.notifications.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(0);
      }
    } catch (error: any) {
      // Silently fail if notifications endpoint isn't available yet
      if (error.message?.includes('JSON Parse error')) {
        // Backend endpoint not deployed yet, ignore
        logger.log('Notifications endpoint not available yet');
      } else {
        logger.error('Failed to fetch unread count:', error);
        logger.error('Error details:', {
          message: error.message,
          status: error.status,
          statusCode: error.statusCode,
          code: error.code,
          details: error.details,
          name: error.name
        });
        
        // If it's a 401, the token might be invalid
        if (error.statusCode === 401) {
          logger.error('Authentication error - token may be invalid or expired');
        }
      }
      setUnreadCount(0);
    }
  }, [walletAddress]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await ApiService.notifications.markAsRead(id);
      await refreshUnreadCount();
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  }, [refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await ApiService.notifications.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  }, []);

  // Refresh unread count when wallet changes or on mount
  useEffect(() => {
    // Only fetch if we have a wallet address (user is authenticated)
    if (walletAddress) {
      // Add a small delay to ensure auth token is set
      const timer = setTimeout(() => {
        refreshUnreadCount();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [walletAddress, refreshUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!walletAddress) return; // Don't poll if not authenticated
    
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}