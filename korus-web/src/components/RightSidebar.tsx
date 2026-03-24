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

interface LiveGame {
  id: string;
  title: string;
  detail: string;
  wager: string;
}

interface TrendingItem {
  id: number;
  label: string;
  topic: string;
  posts: string;
}

interface TopTipper {
  id: number;
  rank: number;
  name: string;
  avatar: string;
  total: string;
}

// Placeholder trending data
const placeholderTrending: TrendingItem[] = [
  { id: 1, label: '1 \u00b7 Trending in Crypto', topic: 'Solana Breakpoint', posts: '2,431 posts' },
  { id: 2, label: '2 \u00b7 Trending in Gaming', topic: 'On-Chain Chess', posts: '1,892 posts' },
  { id: 3, label: '3 \u00b7 Trending in NFTs', topic: 'Mad Lads Floor', posts: '1,204 posts' },
  { id: 4, label: '4 \u00b7 Trending in DeFi', topic: 'Jupiter Airdrop', posts: '987 posts' },
  { id: 5, label: '5 \u00b7 Trending', topic: 'Korus Launch', posts: '756 posts' },
];

// Placeholder top tippers data
const placeholderTippers: TopTipper[] = [
  { id: 1, rank: 1, name: 'SolWhale.sol', avatar: 'SW', total: '42.5 SOL' },
  { id: 2, rank: 2, name: 'DegenKing', avatar: 'DK', total: '31.2 SOL' },
  { id: 3, rank: 3, name: 'CryptoNinja', avatar: 'CN', total: '24.8 SOL' },
  { id: 4, rank: 4, name: 'NFTCollector', avatar: 'NC', total: '18.3 SOL' },
  { id: 5, rank: 5, name: 'AlphaTrader', avatar: 'AT', total: '12.1 SOL' },
];

// Placeholder live games if API returns nothing
const placeholderGames: LiveGame[] = [
  { id: 'placeholder-1', title: 'Tic Tac Toe', detail: '1/2 players \u00b7 30m left', wager: '0.5 SOL' },
  { id: 'placeholder-2', title: 'Rock Paper Scissors', detail: '1/2 players \u00b7 25m left', wager: '1.0 SOL' },
  { id: 'placeholder-3', title: 'Coin Flip', detail: '1/2 players \u00b7 15m left', wager: '2.0 SOL' },
];

export default function RightSidebar({ showNotifications = false, onNotificationCountChange }: RightSidebarProps) {
  const router = useRouter();
  const { connected } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);

  // Fetch live games on mount
  useEffect(() => {
    fetchLiveGames();
  }, []);

  // Fetch notifications when connected and authenticated
  useEffect(() => {
    if (connected && isAuthenticated && token) {
      fetchNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, isAuthenticated, token]);

  const fetchLiveGames = async () => {
    setIsLoadingGames(true);
    try {
      const gamesResponse = await gamesAPI.gamesAPI.getAllGames('waiting');
      const games = gamesResponse.games || [];

      const mapped: LiveGame[] = games.map(game => {
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
          title: gameTitle,
          detail: `${game.player2 ? '2' : '1'}/2 players \u00b7 30m left`,
          wager: `${game.wager} SOL`,
        };
      });

      setLiveGames(mapped.length > 0 ? mapped.slice(0, 5) : placeholderGames);
    } catch (error) {
      logger.error('Failed to fetch live games:', error);
      setLiveGames(placeholderGames);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await notificationsAPI.getNotifications(token);
      setNotifications(response.notifications);

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
      await notificationsAPI.markAsRead(notification.id, token);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );

      const unreadCount = notifications.filter(n => !n.read && n.id !== notification.id).length;
      if (onNotificationCountChange) {
        onNotificationCountChange(unreadCount);
      }

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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const truncateAddress = (address: string) => {
    if (!address || address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#f59e0b';
    if (rank === 2) return '#a1a1a1';
    return '#525252';
  };

  // Widget container styles
  const widgetStyle: React.CSSProperties = {
    background: '#141414',
    border: '1px solid #1a1a1a',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
  };

  const widgetTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '14px',
    color: '#fafafa',
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '320px',
        flexShrink: 0,
        zIndex: 30,
        padding: '20px 16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="hidden lg:flex"
    >
      {/* Notifications overlay when active */}
      {showNotifications ? (
        <div style={widgetStyle}>
          <h2 style={widgetTitleStyle}>Notifications</h2>
          <div role="list" aria-label="Notifications">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#525252' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid #2a2a2a',
                    borderTopColor: 'rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                    margin: '0 auto 8px',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p style={{ fontSize: '12px' }}>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#525252' }}>
                <p style={{ fontSize: '14px' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
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
                  style={{
                    padding: '10px 0',
                    borderTop: '1px solid #1a1a1a',
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#262626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.6)',
                        flexShrink: 0,
                      }}
                    >
                      {notification.fromUser
                        ? notification.fromUser.walletAddress.slice(0, 2).toUpperCase()
                        : 'N'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
                            {notification.title}
                          </p>
                          <p style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>
                            {notification.message}
                          </p>
                          {notification.fromUser && (
                            <p style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                              from {truncateAddress(notification.fromUser.walletAddress)}
                            </p>
                          )}
                          {notification.amount && (
                            <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500, marginTop: '4px' }}>
                              {notification.amount} SOL
                            </p>
                          )}
                        </div>
                        {!notification.read && (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              marginLeft: '8px',
                              marginTop: '6px',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#737373', marginTop: '4px', display: 'block' }}>
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div style={{ paddingTop: '12px' }}>
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b5cf6',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: 0,
                }}
                className="hover:opacity-80"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Widget 1: Live Games */}
          <div style={widgetStyle}>
            <h2 style={widgetTitleStyle}>
              <span role="img" aria-label="live">&#x1F534;</span> Live Games
            </h2>
            {isLoadingGames ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#525252' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid #2a2a2a',
                    borderTopColor: 'rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                    margin: '0 auto 8px',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p style={{ fontSize: '12px' }}>Loading games...</p>
              </div>
            ) : (
              liveGames.map((game, index) => (
                <div
                  key={game.id}
                  onClick={() => {
                    if (!game.id.startsWith('placeholder-')) {
                      const gameId = game.id.replace('game-', '');
                      router.push(`/games/${gameId}`);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 0',
                    borderTop: index > 0 ? '1px solid #1a1a1a' : 'none',
                    cursor: game.id.startsWith('placeholder-') ? 'default' : 'pointer',
                  }}
                  className={game.id.startsWith('placeholder-') ? '' : 'hover:opacity-80 transition-opacity'}
                >
                  {/* Pulsing red dot */}
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#f43f5e',
                      flexShrink: 0,
                      animation: 'livePulse 1.5s infinite',
                    }}
                  />
                  {/* Game info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
                      {game.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#737373' }}>
                      {game.detail}
                    </div>
                  </div>
                  {/* Wager */}
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#43e97b',
                      flexShrink: 0,
                    }}
                  >
                    {game.wager}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Widget 2: Trending on Korus */}
          <div style={widgetStyle}>
            <h2 style={widgetTitleStyle}>Trending on Korus</h2>
            {placeholderTrending.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 0',
                  borderTop: index > 0 ? '1px solid #1a1a1a' : 'none',
                  cursor: 'pointer',
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ fontSize: '12px', color: '#525252' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fafafa', marginTop: '2px' }}>
                  {item.topic}
                </div>
                <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>
                  {item.posts}
                </div>
              </div>
            ))}
          </div>

          {/* Widget 3: Top Tippers This Week */}
          <div style={widgetStyle}>
            <h2 style={widgetTitleStyle}>Top Tippers This Week</h2>
            {placeholderTippers.map((tipper) => (
              <div
                key={tipper.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                }}
              >
                {/* Rank number */}
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: getRankColor(tipper.rank),
                    width: '18px',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {tipper.rank}
                </div>
                {/* Avatar circle */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#262626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.6)',
                    flexShrink: 0,
                  }}
                >
                  {tipper.avatar}
                </div>
                {/* Name */}
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#fafafa', minWidth: 0 }}>
                  {tipper.name}
                </div>
                {/* SOL total */}
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#43e97b',
                    flexShrink: 0,
                  }}
                >
                  {tipper.total}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Spacer to push footer down */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ marginTop: '16px', paddingLeft: '4px', paddingRight: '4px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {['Terms', 'Privacy', 'About', 'Docs'].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontSize: '12px',
                color: '#525252',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.textDecoration = 'none'; }}
            >
              {link}
            </a>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#404040' }}>
          &copy; 2025 Korus. All rights reserved.
        </div>
      </div>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes livePulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
