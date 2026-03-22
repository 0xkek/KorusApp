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

  // Fetch recent activities (events and games)
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
      // Fetch active events
      const eventsResponse = await eventsAPI.getEvents({ status: 'active' });
      const events = eventsResponse.events || [];

      // Fetch active games
      const gamesResponse = await gamesAPI.gamesAPI.getAllGames('waiting');
      const games = gamesResponse.games || [];

      // Transform events to activity format with timestamp
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

      // Transform games to activity format with timestamp
      const gameActivities = games.map(game => {
        let gameTitle = 'Game';
        const gameType = game.gameType?.toLowerCase();

        if (gameType === 'tic-tac-toe' || gameType === 'tictactoe') {
          gameTitle = 'Tic Tac Toe';
        } else if (gameType === 'rps' || gameType === 'rock-paper-scissors') {
          gameTitle = 'Rock Paper Scissors';
        } else if (gameType === 'connect-four' || gameType === 'connectfour') {
          gameTitle = 'Connect Four';
        } else if (gameType === 'coin-flip' || gameType === 'coinflip') {
          gameTitle = 'Coin Flip';
        } else if (game.gameType) {
          // Use the raw gameType if it exists, formatted nicely
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

      // Combine and sort by timestamp (most recent first), then limit to 8
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

  const getEventTypeColor = (category: string) => {
    switch (category) {
      case 'whitelist': return 'text-purple-400';
      case 'token_launch': return 'text-cyan-400';
      case 'nft_mint': return 'text-pink-400';
      case 'airdrop': return 'text-yellow-400';
      case 'ido': return 'text-korus-primary';
      default: return 'text-blue-400';
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

  const whoToFollow = [
    {
      username: 'solana_labs',
      name: 'Solana Labs',
      verified: true,
      followers: '2.1M',
    },
    {
      username: 'phantom',
      name: 'Phantom',
      verified: true,
      followers: '890K',
    },
    {
      username: 'magic_eden',
      name: 'Magic Eden',
      verified: true,
      followers: '654K',
    },
  ];

  return (
    <div
      className="fixed right-0 top-0 bottom-0 lg:w-96 md:w-80 bg-black border-l border-korus-border overflow-y-scroll hidden md:block z-10"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        pointerEvents: 'auto'
      }}
    >
      {/* Content based on showNotifications prop */}
      {showNotifications ? (
        /* Notifications */
        <div className="mb-6 p-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-korus-text">🔔 Notifications</h2>
          </div>
          <div role="list" aria-label="Notifications">
            {isLoading ? (
              <div className="text-center py-8 text-korus-textSecondary">
                <div className="spinner mx-auto mb-2"></div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-korus-textSecondary">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-korus-borderLight mx-[-1rem] px-4 py-4 hover:bg-korus-surface/40 hover:border-korus-border transition-all duration-200 cursor-pointer group ${
                    !notification.read ? 'bg-korus-surface/20 backdrop-blur-sm' : 'bg-korus-surface/10 backdrop-blur-sm'
                  }`}
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
                        <div className="w-8 h-8 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-sm font-bold text-black">
                          {notification.fromUser.walletAddress.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-korus-surface/60">
                          🔔
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-korus-text text-sm font-semibold mb-1">
                            {notification.title}
                          </p>
                          <p className="text-korus-textSecondary text-sm">
                            {notification.message}
                          </p>

                          {/* Show from user if present */}
                          {notification.fromUser && (
                            <div className="mt-1 text-xs text-korus-primary">
                              from {truncateAddress(notification.fromUser.walletAddress)}
                            </div>
                          )}

                          {/* Special data for tips */}
                          {notification.amount && (
                            <div className="mt-1 text-xs text-yellow-400 font-medium">
                              💰 {notification.amount} SOL
                            </div>
                          )}
                        </div>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-korus-primary rounded-full ml-2 mt-1"></div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-korus-textTertiary text-xs">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 pt-3">
              <button
                onClick={handleMarkAllAsRead}
                className="text-korus-primary text-sm hover:underline"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Recent Activity */
        <div className="mb-6 p-4">
          <h2 className="text-2xl font-bold text-korus-text mb-4">Recent Activity</h2>
        <div>
          {isLoadingActivities ? (
            <div className="text-center py-8 text-korus-textSecondary">
              <div className="w-8 h-8 border-4 border-korus-primary/20 border-t-korus-primary rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm">Loading activities...</p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8 text-korus-textSecondary">
              <div className="text-4xl mb-2">📊</div>
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
              className="border-b border-korus-borderLight bg-korus-surface/20 backdrop-blur-sm mx-[-1rem] px-4 py-4 hover:bg-korus-surface/40 hover:border-korus-border transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-lg mt-0.5">
                    {activity.type === 'game' ? getGameIcon(activity.title) : getEventTypeIcon(activity.category || 'Other')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Event/Game Tag */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          activity.type === 'game'
                            ? 'bg-korus-primary/20 text-korus-primary border border-korus-primary/40'
                            : 'bg-korus-secondary/20 text-korus-secondary border border-korus-secondary/40'
                        }`}
                        style={activity.type === 'event' ? {
                          color: 'var(--color-korus-secondary)',
                          WebkitTextFillColor: 'var(--color-korus-secondary)'
                        } : undefined}
                      >
                        {activity.type === 'game' ? 'GAME' : 'EVENT'}
                      </span>
                      {activity.type === 'event' && activity.premiumOnly && (
                        <span className="text-xs bg-gradient-to-r from-korus-primary to-korus-secondary text-black px-2 py-0.5 rounded-full font-bold">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <div className="text-korus-text font-semibold text-sm leading-tight">
                      <span
                        className={activity.type === 'game' ? 'text-korus-primary' : 'text-korus-secondary'}
                        style={{
                          color: activity.type === 'game' ? 'var(--color-korus-primary)' : 'var(--color-korus-secondary)',
                          WebkitTextFillColor: activity.type === 'game' ? 'var(--color-korus-primary)' : 'var(--color-korus-secondary)'
                        }}
                      >
                        {activity.title}
                      </span>
                    </div>
                  </div>
                </div>
                {activity.type === 'game' ? (
                  <div
                    className="text-korus-primary text-sm font-bold ml-2 flex-shrink-0"
                    style={{
                      color: 'var(--color-korus-primary)',
                      WebkitTextFillColor: 'var(--color-korus-primary)'
                    }}
                  >
                    {activity.wager}
                  </div>
                ) : (
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 ${getEventTypeColor(activity.category || 'Other')} bg-opacity-20`} style={{backgroundColor: `${getEventTypeColor(activity.category || 'Other').replace('text-', '')}20`}}>
                    {(activity.category || 'Other').replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>

              {activity.type === 'event' && activity.project && (
                <div className="text-korus-textSecondary text-xs mb-2">by {activity.project}</div>
              )}

              <div className="flex items-center justify-between text-sm mb-3">
                {activity.type === 'game' ? (
                  <>
                    <div className="text-korus-textSecondary">
                      Players: <span
                        className="text-korus-primary font-medium"
                        style={{
                          color: 'var(--color-korus-primary)',
                          WebkitTextFillColor: 'var(--color-korus-primary)'
                        }}
                      >
                        {activity.players}
                      </span>
                    </div>
                    <div
                      className="text-korus-secondary font-medium"
                      style={{
                        color: 'var(--color-korus-secondary)',
                        WebkitTextFillColor: 'var(--color-korus-secondary)'
                      }}
                    >
                      {activity.timeLeft} left
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-korus-textSecondary">
                      <span
                        className="text-korus-secondary font-medium"
                        style={{
                          color: 'var(--color-korus-secondary)',
                          WebkitTextFillColor: 'var(--color-korus-secondary)'
                        }}
                      >
                        {activity.maxParticipants
                          ? `${activity.participants}/${activity.maxParticipants}`
                          : `${activity.participants}`
                        }
                      </span>
                      {' participants'}
                    </div>
                    <div
                      className={activity.isLive ? "text-korus-primary font-bold" : "text-korus-secondary font-medium"}
                      style={{
                        color: activity.isLive ? 'var(--color-korus-primary)' : 'var(--color-korus-secondary)',
                        WebkitTextFillColor: activity.isLive ? 'var(--color-korus-primary)' : 'var(--color-korus-secondary)'
                      }}
                    >
                      {activity.isLive ? '🔴 Live Now' : `in ${activity.time}`}
                    </div>
                  </>
                )}
              </div>

              {activity.type === 'event' && activity.chain && (
                <div className="text-xs text-korus-textTertiary mb-2">
                  {activity.chain} • {activity.price && `${activity.price} •`}
                </div>
              )}

              <button
                className="w-full text-sm font-bold py-2 rounded-lg transition-all border-2 border-korus-primary text-korus-primary hover:bg-korus-primary/10"
                style={{
                  color: 'var(--color-korus-primary)',
                  WebkitTextFillColor: 'var(--color-korus-primary)',
                  borderColor: 'var(--color-korus-primary)'
                }}
              >
                {activity.type === 'game'
                  ? 'Join Game'
                  : activity.isLive
                    ? 'Join Now'
                    : 'View Event'
                }
              </button>
            </div>
          ))
          )}
        </div>
          <div className="px-4 pt-3">
            <button
              onClick={() => router.push('/events')}
              className="text-korus-primary text-sm hover:underline"
            >
              View all activity
            </button>
          </div>
        </div>
      )}

      {/* Who to follow */}
      <div className="bg-korus-surface/40 rounded-2xl p-4 mb-6">
        <h2 className="text-2xl font-bold text-korus-text mb-4">Who to follow</h2>
        <div className="space-y-4">
          {whoToFollow.map((user) => (
            <div key={user.username} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">
                    {user.username.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-korus-text font-medium text-sm">{user.name}</span>
                    {user.verified && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                        <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-korus-textSecondary text-xs">@{user.username}</div>
                  <div className="text-korus-textTertiary text-xs">{user.followers} followers</div>
                </div>
              </div>
              <button className="bg-korus-primary text-black font-medium px-4 py-1.5 rounded-full text-sm hover:bg-korus-secondary transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="text-korus-primary text-sm mt-3 hover:underline">
          Show more
        </button>
      </div>

      {/* Recent Games */}
      <div className="bg-korus-surface/40 rounded-2xl p-4">
        <h2 className="text-2xl font-bold text-korus-text mb-4">Recent Games</h2>
        <div className="space-y-3">
          <div className="hover:bg-korus-surface/60 p-2 rounded-lg transition-colors cursor-pointer">
            <div className="text-korus-text font-medium">Tic Tac Toe</div>
            <div className="text-korus-textSecondary text-sm">12 games played today</div>
            <div className="text-korus-primary text-sm">Avg wager: 0.05 SOL</div>
          </div>
          <div className="hover:bg-korus-surface/60 p-2 rounded-lg transition-colors cursor-pointer">
            <div className="text-korus-text font-medium">Rock Paper Scissors</div>
            <div className="text-korus-textSecondary text-sm">8 games played today</div>
            <div className="text-korus-primary text-sm">Avg wager: 0.1 SOL</div>
          </div>
          <div className="hover:bg-korus-surface/60 p-2 rounded-lg transition-colors cursor-pointer">
            <div className="text-korus-text font-medium">Coin Flip</div>
            <div className="text-korus-textSecondary text-sm">25 games played today</div>
            <div className="text-korus-primary text-sm">Avg wager: 0.02 SOL</div>
          </div>
        </div>
        <button className="text-korus-primary text-sm mt-3 hover:underline">
          View all games
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-korus-border">
        <div className="flex flex-wrap gap-2 text-korus-textTertiary text-xs">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">About</a>
          <a href="#" className="hover:underline">Help</a>
        </div>
        <div className="text-korus-textTertiary text-xs mt-2">
          © 2024 Korus
        </div>
      </div>
    </div>
  );
}