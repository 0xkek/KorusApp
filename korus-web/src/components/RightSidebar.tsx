'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { notificationsAPI, type Notification as APINotification } from '@/lib/api';

interface RightSidebarProps {
  showNotifications?: boolean;
  onNotificationsClose?: () => void;
  onNotificationCountChange?: (count: number) => void;
}

export default function RightSidebar({ showNotifications = false, onNotificationCountChange }: RightSidebarProps) {
  const router = useRouter();
  const { connected } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications when connected and authenticated
  useEffect(() => {
    if (connected && isAuthenticated && token) {
      fetchNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, isAuthenticated, token]);

  const fetchNotifications = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await notificationsAPI.getNotifications(token);
      setNotifications(response.notifications);

      // Update unread count
      const unreadCount = response.notifications.filter(n => !n.read).length;
      if (onNotificationCountChange) {
        onNotificationCountChange(unreadCount);
      }
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: APINotification) => {
    if (!token) return;

    try {
      // Mark as read
      await notificationsAPI.markAsRead(notification.id, token);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );

      // Update unread count
      const unreadCount = notifications.filter(n => !n.read && n.id !== notification.id).length;
      if (onNotificationCountChange) {
        onNotificationCountChange(unreadCount);
      }

      // Navigate to post if postId exists
      if (notification.postId) {
        router.push(`/post/${notification.postId}`);
      }
    } catch (error) {
      logger.error('Failed to handle notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;

    try {
      await notificationsAPI.markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      if (onNotificationCountChange) {
        onNotificationCountChange(0);
      }
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  // Helper function to format timestamps
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (!address || address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };


  return (
    <div className="fixed right-0 top-0 h-screen w-[320px] z-30 py-[24px] px-[20px] hidden lg:flex flex-col overflow-y-auto">
      {/* Content based on showNotifications prop */}
      {showNotifications ? (
        /* Notifications Widget */
        <div className="bg-[#12131a] border border-[#22232e] rounded-[16px] p-[16px] mb-[16px]">
          <h2 className="text-[18px] font-extrabold tracking-[-0.3px] mb-[14px]">Notifications</h2>
          <div role="list" aria-label="Notifications">
            {isLoading ? (
              <div className="text-center py-8 text-white/30">
                <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-white/30">
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="py-[10px] border-b border-[#22232e] last:border-b-0 cursor-pointer"
                  role="listitem"
                  aria-label={`${notification.type} notification`}
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {notification.fromUser ? (
                        <div className="w-[32px] h-[32px] bg-[#1a1b24] rounded-full flex items-center justify-center text-xs font-bold text-white/60">
                          {notification.fromUser.walletAddress.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-xs bg-[#1a1b24] text-white/30">
                          N
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-[14px] font-bold mt-0.5 hover:text-korus-primary transition-colors">
                            {notification.title}
                          </p>
                          <p className="text-[12px] text-[#5c5e6e] mt-0.5">
                            {notification.message}
                          </p>

                          {/* Show from user if present */}
                          {notification.fromUser && (
                            <div className="mt-1 text-[12px] text-[#5c5e6e]">
                              from {truncateAddress(notification.fromUser.walletAddress)}
                            </div>
                          )}

                          {/* Special data for tips */}
                          {notification.amount && (
                            <div className="mt-1 text-xs text-yellow-400 font-medium">
                              {notification.amount} SOL
                            </div>
                          )}
                        </div>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-korus-primary rounded-full ml-2 mt-1.5"></div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[12px] text-[#5c5e6e] mt-1 block">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="pt-3">
              <button
                onClick={handleMarkAllAsRead}
                className="text-korus-primary text-[12px] hover:underline"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Trending on Korus Widget */
        <div className="bg-[#12131a] border border-[#22232e] rounded-[16px] p-[16px] mb-[16px]">
          <h2 className="text-[18px] font-extrabold tracking-[-0.3px] mb-[14px]">Trending on Korus</h2>
          <div>
            <div className="py-[10px] border-b border-[#22232e] cursor-pointer group">
              <div className="text-[12px] text-[#5c5e6e]">Solana · Trending</div>
              <div className="text-[14px] font-bold my-[2px] group-hover:text-korus-primary transition-colors">#GameEscrow</div>
              <div className="text-[12px] text-[#5c5e6e]">142 posts</div>
            </div>
            <div className="py-[10px] border-b border-[#22232e] cursor-pointer group">
              <div className="text-[12px] text-[#5c5e6e]">Gaming · Trending</div>
              <div className="text-[14px] font-bold my-[2px] group-hover:text-korus-primary transition-colors">Connect Four Tournament</div>
              <div className="text-[12px] text-[#5c5e6e]">89 posts</div>
            </div>
            <div className="py-[10px] cursor-pointer group">
              <div className="text-[12px] text-[#5c5e6e]">DeFi · Trending</div>
              <div className="text-[14px] font-bold my-[2px] group-hover:text-korus-primary transition-colors">#SolanaGaming</div>
              <div className="text-[12px] text-[#5c5e6e]">67 posts</div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="text-[12px] text-[#5c5e6e] mt-[16px] px-1">
        &copy; 2025 Korus &middot; Terms &middot; Privacy
      </div>
    </div>
  );
}