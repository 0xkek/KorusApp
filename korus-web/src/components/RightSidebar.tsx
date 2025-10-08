'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  type: 'like' | 'reply' | 'tip' | 'follow' | 'mention' | 'game' | 'event';
  message: string;
  user?: string;
  userAvatar?: string;
  timestamp: number;
  read: boolean;
  actionIcon?: string;
  actionColor?: string;
  relatedData?: any;
}

interface RightSidebarProps {
  showNotifications?: boolean;
  onNotificationsClose?: () => void;
}

export default function RightSidebar({ showNotifications = false, onNotificationsClose }: RightSidebarProps) {
  const { connected } = useWallet();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  if (!connected) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e as any);
    }
  };

  // Mock notifications data
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'like',
      message: 'liked your post about Solana DeFi',
      user: 'cryptodev.sol',
      userAvatar: '🚀',
      timestamp: Date.now() - 300000, // 5 min ago
      read: false,
      actionIcon: '❤️',
      actionColor: 'text-red-400'
    },
    {
      id: 2,
      type: 'tip',
      message: 'sent you 0.1 SOL tip for your analysis',
      user: 'alice.sol',
      userAvatar: '🎨',
      timestamp: Date.now() - 600000, // 10 min ago
      read: false,
      actionIcon: '💰',
      actionColor: 'text-yellow-400',
      relatedData: { amount: '0.1 SOL' }
    },
    {
      id: 3,
      type: 'reply',
      message: 'replied to your post',
      user: 'bob.sol',
      userAvatar: '⚡',
      timestamp: Date.now() - 900000, // 15 min ago
      read: true,
      actionIcon: '💬',
      actionColor: 'text-blue-400'
    },
    {
      id: 4,
      type: 'follow',
      message: 'started following you',
      user: 'defi_master',
      userAvatar: '🏆',
      timestamp: Date.now() - 1800000, // 30 min ago
      read: true,
      actionIcon: '👤',
      actionColor: 'text-green-400'
    },
    {
      id: 5,
      type: 'mention',
      message: 'mentioned you in a post about Web3 gaming',
      user: 'gamefi_guru',
      userAvatar: '🎮',
      timestamp: Date.now() - 3600000, // 1 hr ago
      read: true,
      actionIcon: '@',
      actionColor: 'text-purple-400'
    },
    {
      id: 6,
      type: 'game',
      message: 'challenged you to a Tic Tac Toe game',
      user: 'player_one',
      userAvatar: '🎯',
      timestamp: Date.now() - 7200000, // 2 hrs ago
      read: true,
      actionIcon: '🎮',
      actionColor: 'text-cyan-400'
    },
    {
      id: 7,
      type: 'event',
      message: 'Your event "DeFi Workshop" has 50 new participants',
      timestamp: Date.now() - 10800000, // 3 hrs ago
      read: true,
      actionIcon: '📅',
      actionColor: 'text-orange-400'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'game',
      title: 'Tic Tac Toe',
      wager: '25 SOL',
      players: '1/2',
      timeLeft: '4m',
      status: 'waiting',
      timestamp: Date.now() - 60000 // 1 min ago
    },
    {
      id: 2,
      type: 'event',
      title: 'DeFi Protocol Whitelist',
      project: 'SolanaSwap',
      time: '2h',
      participants: 234,
      maxParticipants: 500,
      category: 'whitelist',
      chain: 'Solana',
      premiumOnly: true,
      timestamp: Date.now() - 300000 // 5 min ago
    },
    {
      id: 3,
      type: 'game',
      title: 'Rock Paper Scissors',
      wager: '50 SOL',
      players: '0/2',
      timeLeft: '3m',
      status: 'waiting',
      timestamp: Date.now() - 720000 // 12 min ago
    },
    {
      id: 4,
      type: 'event',
      title: 'Cyber Punks NFT Mint',
      project: 'CyberPunks',
      time: '1d',
      participants: 567,
      maxParticipants: 1000,
      category: 'nft_mint',
      chain: 'Solana',
      price: '2 SOL',
      timestamp: Date.now() - 1440000 // 24 min ago
    },
    {
      id: 5,
      type: 'game',
      title: 'Connect Four',
      wager: '15 SOL',
      players: '1/2',
      timeLeft: '2m',
      status: 'waiting',
      timestamp: Date.now() - 1800000 // 30 min ago
    },
    {
      id: 6,
      type: 'event',
      title: 'Loyalty Rewards Airdrop',
      project: 'Korus',
      time: 'Live Now',
      participants: 1234,
      category: 'airdrop',
      chain: 'Solana',
      isLive: true,
      timestamp: Date.now() - 3600000 // 1 hr ago
    },
    {
      id: 7,
      type: 'game',
      title: 'Coin Flip',
      wager: '5 SOL',
      players: '0/2',
      timeLeft: '1m',
      status: 'waiting',
      timestamp: Date.now() - 7200000 // 2 hrs ago
    },
  ].sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first

  // Helper function to format timestamps
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  // Get unread notification count
  const unreadCount = notifications.filter(n => !n.read).length;

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
    <div className="fixed right-0 top-0 bottom-0 lg:w-96 md:w-80 bg-black border-l border-korus-border p-4 overflow-y-auto hidden md:block">
      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search Korus"
              className="w-full bg-korus-surface/40 text-korus-text pl-12 pr-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-korus-primary focus:bg-korus-surface/60 transition-colors"
              aria-label="Search posts and users"
              role="searchbox"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-korus-surface/60 rounded-full transition-colors"
              >
                <svg className="w-4 h-4 text-korus-textSecondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content based on showNotifications prop */}
      {showNotifications ? (
        /* Notifications */
        <div className="mb-6">
          <div className="mb-4 px-4">
            <h2 className="text-2xl font-bold text-korus-text">🔔 Notifications</h2>
          </div>
          <div role="list" aria-label="Notifications">
            {notifications.length === 0 ? (
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
                  aria-label={`${notification.type} notification from ${notification.user || 'system'}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      // Handle notification click
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar or Action Icon */}
                    <div className="flex-shrink-0">
                      {notification.user ? (
                        <div className="w-8 h-8 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-sm font-bold text-black">
                          {notification.userAvatar || notification.user.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${notification.actionColor}`}>
                          {notification.actionIcon}
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-korus-text text-sm">
                            {notification.user && (
                              <span className="font-semibold">{notification.user} </span>
                            )}
                            <span className="text-korus-textSecondary">{notification.message}</span>
                          </p>

                          {/* Special data for tips */}
                          {notification.type === 'tip' && notification.relatedData && (
                            <div className="mt-1 text-xs text-yellow-400 font-medium">
                              💰 {notification.relatedData.amount}
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
                          {formatTimeAgo(notification.timestamp)}
                        </span>

                        {/* Action buttons for specific notification types */}
                        {(notification.type === 'game' || notification.type === 'follow') && (
                          <button className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                            notification.type === 'game'
                              ? 'bg-korus-primary text-black hover:bg-korus-secondary'
                              : 'bg-korus-surface/40 border border-korus-borderLight text-korus-primary hover:bg-korus-surface/60'
                          }`}>
                            {notification.type === 'game' ? 'Join Game' : 'Follow Back'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 pt-3">
              <button className="text-korus-primary text-sm hover:underline">
                Mark all as read
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Recent Activity */
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-korus-text mb-4 px-4">🎮 Recent Activity</h2>
        <div>
          {recentActivities.map((activity) => (
            <div key={activity.id} className="border-b border-korus-borderLight bg-korus-surface/20 backdrop-blur-sm mx-[-1rem] px-4 py-4 hover:bg-korus-surface/40 hover:border-korus-border transition-all duration-200 cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {activity.type === 'game' ? getGameIcon(activity.title) : getEventTypeIcon(activity.category)}
                  </span>
                  <div className="text-korus-text font-semibold">{activity.title}</div>
                  {activity.type === 'event' && activity.premiumOnly && (
                    <span className="text-xs bg-gradient-to-r from-korus-primary to-korus-secondary text-black px-2 py-0.5 rounded-full font-bold">
                      PREMIUM
                    </span>
                  )}
                </div>
                {activity.type === 'game' ? (
                  <div className="text-korus-primary text-sm font-medium">{activity.wager}</div>
                ) : (
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${getEventTypeColor(activity.category)} bg-opacity-20`} style={{backgroundColor: `${getEventTypeColor(activity.category).replace('text-', '')}20`}}>
                    {activity.category.replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>

              {activity.type === 'event' && activity.project && (
                <div className="text-korus-textSecondary text-xs mb-2">by {activity.project}</div>
              )}

              <div className="flex items-center justify-between text-sm mb-3">
                {activity.type === 'game' ? (
                  <>
                    <div className="text-korus-textSecondary">Players: {activity.players}</div>
                    <div className="text-orange-400">{activity.timeLeft} left</div>
                  </>
                ) : (
                  <>
                    <div className="text-korus-textSecondary">
                      {activity.maxParticipants
                        ? `${activity.participants}/${activity.maxParticipants} participants`
                        : `${activity.participants} participants`
                      }
                    </div>
                    <div className={activity.isLive ? "text-red-400 font-medium" : "text-orange-400"}>
                      {activity.isLive ? 'Live Now' : `in ${activity.time}`}
                    </div>
                  </>
                )}
              </div>

              {activity.type === 'event' && activity.chain && (
                <div className="text-xs text-korus-textTertiary mb-2">
                  {activity.chain} • {activity.price && `${activity.price} •`}
                </div>
              )}

              <button className={`w-full text-sm font-bold py-1.5 rounded-lg transition-colors ${
                activity.type === 'game'
                  ? 'bg-korus-primary text-black hover:bg-korus-secondary'
                  : activity.isLive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-korus-surface/40 border border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
              }`}>
                {activity.type === 'game'
                  ? 'Join Game'
                  : activity.isLive
                    ? 'Participate Now'
                    : 'Join Event'
                }
              </button>
            </div>
          ))}
        </div>
          <div className="px-4 pt-3">
            <button className="text-korus-primary text-sm hover:underline">
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
                      <div className="w-5 h-5 bg-korus-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
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