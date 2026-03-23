'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { notificationsAPI, type Notification as APINotification } from '@/lib/api';
import * as eventsAPI from '@/lib/api/events';
import * as gamesAPI from '@/lib/api/games';

interface RightSidebarProps {
  showNotifications?: boolean;
  onNotificationsClose?: () => void;
  onNotificationCountChange?: (count: number) => void;
}

interface RecentActivity {
  id: string;
  type: 'event' | 'game';
  title: string;
  category?: string;
  project?: string;
  participants?: number;
  maxParticipants?: number | null;
  players?: string;
  wager?: string;
  time?: string;
  timeLeft?: string;
  isLive?: boolean;
  chain?: string;
  price?: string;
  premiumOnly?: boolean;
  timestamp: number;
}

export default function RightSidebar({ showNotifications = false, onNotificationCountChange }: RightSidebarProps) {
  const router = useRouter();
  const { connected } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // Fetch recent activities on mount
  useEffect(() => {
    fetchRecentActivities();
  }, []);

  // Fetch notifications when connected and authenticated
  useEffect(() => {
    if (connected && isAuthenticated && token) {
      fetchNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, isAuthenticated, token]);

  const fetchRecentActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const eventsResponse = await eventsAPI.getEvents({ status: 'active' });
      const events = eventsResponse.events || [];
      const gamesResponse = await gamesAPI.gamesAPI.getAllGames('waiting');
      const games = gamesResponse.games || [];

      const eventActivities = events.map(event => {
        const startTime = new Date(event.startDate);
        const now = new Date();
        const isLive = startTime <= now;
        const diff = startTime.getTime() - now.getTime();
        let timeString = '';
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          if (days > 0) timeString = `${days}d`;
          else if (hours > 0) timeString = `${hours}h`;
          else timeString = `${Math.floor(diff / (1000 * 60))}m`;
        }
        return {
          id: `event-${event.id}`,
          type: 'event' as const,
          title: event.title,
          category: event.type,
          project: event.projectName,
          participants: event.registrationCount || 0,
          maxParticipants: event.maxSpots,
          time: timeString,
          isLive,
          chain: 'Solana',
          premiumOnly: false,
          timestamp: new Date(event.createdAt).getTime()
        };
      });

      const gameActivities = games.map(game => {
        let gameTitle = 'Game';
        const gameType = game.gameType?.toLowerCase();
        if (gameType === 'tic-tac-toe' || gameType === 'tictactoe') gameTitle = 'Tic Tac Toe';
        else if (gameType === 'rps' || gameType === 'rock-paper-scissors') gameTitle = 'Rock Paper Scissors';
        else if (gameType === 'connect-four' || gameType === 'connectfour') gameTitle = 'Connect Four';
        else if (gameType === 'coin-flip' || gameType === 'coinflip') gameTitle = 'Coin Flip';
        else if (game.gameType) {
          gameTitle = game.gameType.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        }
        return {
          id: `game-${game.id}`,
          type: 'game' as const,
          title: gameTitle,
          players: `${game.player2 ? '2' : '1'}/2`,
          wager: `${game.wager} SOL`,
          timeLeft: '30m',
          isLive: game.status === 'waiting',
          timestamp: new Date(game.createdAt).getTime()
        };
      });

      const combined = [...eventActivities, ...gameActivities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8);
      setRecentActivities(combined);
    } catch (error) {
      logger.error('Failed to fetch recent activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

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


  const getEventTypeIcon = (category: string) => {
    switch (category) {
      case 'whitelist': return '📋';
      case 'token_launch': return '🚀';
      case 'nft_mint': return '🖼️';
      case 'airdrop': return '🎁';
      case 'ido': return '📈';
      default: return '📅';
    }
  };

  const getGameIcon = (title: string) => {
    switch (title.toLowerCase()) {
      case 'tic tac toe': return '⭕';
      case 'rock paper scissors': return '✂️';
      case 'connect four': return '🔴';
      case 'coin flip': return '🪙';
      default: return '🎮';
    }
  };

  return (
    <div className="sticky top-0 h-screen w-[320px] shrink-0 z-30 py-[24px] px-[20px] hidden lg:flex flex-col overflow-y-auto">
      {/* Content based on showNotifications prop */}
      {showNotifications ? (
        /* Notifications Widget */
        <div className="bg-[#14151f] border border-[#2a2b38] rounded-[16px] p-[16px] mb-[16px]">
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
                  className="py-[10px] border-b border-[#2a2b38] last:border-b-0 cursor-pointer"
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
                          <p className="text-[12px] text-[#6b6d7a] mt-0.5">
                            {notification.message}
                          </p>

                          {/* Show from user if present */}
                          {notification.fromUser && (
                            <div className="mt-1 text-[12px] text-[#6b6d7a]">
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
                      <span className="text-[12px] text-[#6b6d7a] mt-1 block">
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
        /* Recent Activity Widget */
        <div className="bg-[#14151f] border border-[#2a2b38] rounded-[16px] p-[16px] mb-[16px]">
          <h2 className="text-[18px] font-extrabold tracking-[-0.3px] mb-[14px]">Recent Activity</h2>
          <div>
            {isLoadingActivities ? (
              <div className="text-center py-8 text-white/30">
                <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs">Loading activities...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-white/30">
                <p className="text-sm">No recent activities</p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    if (activity.type === 'event') {
                      const eventId = activity.id.replace('event-', '');
                      router.push(`/events/${eventId}`);
                    } else {
                      const gameId = activity.id.replace('game-', '');
                      router.push(`/games/${gameId}`);
                    }
                  }}
                  className="py-[10px] border-b border-[#2a2b38] last:border-b-0 cursor-pointer"
                >
                  <div className="text-[12px] text-[#6b6d7a]">
                    {activity.type === 'game'
                      ? `${getGameIcon(activity.title)} Game`
                      : `${getEventTypeIcon(activity.category || 'Other')} ${(activity.category || 'Other').replace('_', ' ')}`
                    }
                    {activity.type === 'event' && activity.premiumOnly && ' · Premium'}
                  </div>
                  <div className="text-[14px] font-bold my-[2px] hover:text-korus-primary transition-colors">
                    {activity.title}
                  </div>
                  {activity.type === 'event' && activity.project && (
                    <div className="text-[12px] text-[#6b6d7a] mt-0.5">by {activity.project}</div>
                  )}
                  <div className="text-[12px] text-[#6b6d7a] mt-0.5">
                    {activity.type === 'game' ? (
                      <>Players: {activity.players} · {activity.wager} · {activity.timeLeft} left</>
                    ) : (
                      <>
                        {activity.maxParticipants
                          ? `${activity.participants}/${activity.maxParticipants}`
                          : `${activity.participants}`
                        }
                        {' participants'}
                        {activity.isLive ? ' · Live Now' : activity.time ? ` · in ${activity.time}` : ''}
                        {activity.chain ? ` · ${activity.chain}` : ''}
                        {activity.price ? ` · ${activity.price}` : ''}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-3">
            <button
              onClick={() => router.push('/events')}
              className="text-korus-primary text-[12px] hover:underline"
            >
              View all activity
            </button>
          </div>
        </div>
      )}

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="text-[12px] text-[#6b6d7a] mt-[16px] px-1">
        &copy; 2025 Korus &middot; Terms &middot; Privacy
      </div>
    </div>
  );
}