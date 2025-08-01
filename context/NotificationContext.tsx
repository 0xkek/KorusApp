import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';
import { useWallet } from './WalletContext';
import { logger } from '../utils/logger';

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

    try {
      const response = await ApiService.notifications.getAll();
      if (response && response.notifications) {
        const unread = response.notifications.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      logger.error('Failed to fetch unread count:', error);
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
    refreshUnreadCount();
  }, [walletAddress, refreshUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

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