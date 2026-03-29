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
}

interface LiveGame {
  id: string;
  title: string;
  detail: string;
  wager: string;
}

interface SidebarEvent {
  id: string;
  title: string;
  projectName: string;
  type: string;
  registrationCount: number;
  maxSpots?: number;
  endDate: string;
}

// No placeholder games — only show real live games

export default function RightSidebar({ showNotifications = false }: RightSidebarProps) {
  const router = useRouter();
  const { connected } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [sidebarEvents, setSidebarEvents] = useState<SidebarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Fetch live games and events on mount
  useEffect(() => {
    fetchLiveGames();
    fetchEvents();
  }, []);

  // Fetch notifications when connected and authenticated, poll every 30s when visible
  useEffect(() => {
    if (connected && isAuthenticated && token) {
      fetchNotifications();

      if (showNotifications) {
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, isAuthenticated, token, showNotifications]);

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

      setLiveGames(mapped.slice(0, 5));
    } catch (error) {
      logger.error('Failed to fetch live games:', error);
      setLiveGames([]);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const response = await eventsAPI.getEvents({ status: 'active' });
      const events = response.events || [];
      const mapped: SidebarEvent[] = events.map(event => ({
        id: event.id,
        title: event.title,
        projectName: event.projectName,
        type: event.type,
        registrationCount: event.registrationCount,
        maxSpots: event.maxSpots || undefined,
        endDate: event.endDate,
      }));
      setSidebarEvents(mapped.slice(0, 5));
    } catch (error) {
      logger.error('Failed to fetch events:', error);
      setSidebarEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await notificationsAPI.getNotifications(token);
      setNotifications(response.notifications);

      // Badge count managed by LeftSidebar (polls every 60s)
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

  const formatTimeRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      whitelist: 'Whitelist',
      token_launch: 'Token Launch',
      nft_mint: 'NFT Mint',
      airdrop: 'Airdrop',
      ido: 'IDO',
      raffle: 'Raffle',
    };
    return labels[type] || type;
  };

  // Widget container styles
  const widgetStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-light)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
  };

  const widgetTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '14px',
    color: 'var(--color-text)',
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '300px',
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
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-tertiary)' }}>
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
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-tertiary)' }}>
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
                    borderTop: '1px solid var(--color-border-light)',
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
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                            {notification.title}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                            {notification.message}
                          </p>
                          {notification.fromUser && (
                            <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
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
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'block' }}>
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
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)' }}>
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
            ) : liveGames.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
                No live games right now
              </p>
            ) : (
              liveGames.map((game, index) => (
                <div
                  key={game.id}
                  onClick={() => router.push(`/games`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 0',
                    borderTop: index > 0 ? '1px solid var(--color-border-light)' : 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-80 transition-opacity"
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
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {game.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {game.detail}
                    </div>
                  </div>
                  {/* Wager */}
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      flexShrink: 0,
                    }}
                  >
                    {game.wager}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Widget 2: Upcoming Events */}
          <div style={widgetStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Upcoming Events
              </h2>
              <button
                onClick={() => router.push('/events')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                className="hover:opacity-80"
              >
                View all
              </button>
            </div>
            {isLoadingEvents ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)' }}>
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
                <p style={{ fontSize: '12px' }}>Loading events...</p>
              </div>
            ) : sidebarEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)' }}>
                <p style={{ fontSize: '13px' }}>No active events</p>
                <button
                  onClick={() => router.push('/events')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                  className="hover:opacity-80"
                >
                  Browse events
                </button>
              </div>
            ) : (
              sidebarEvents.map((event, index) => (
                <div
                  key={event.id}
                  onClick={() => router.push('/events')}
                  style={{
                    padding: '10px 0',
                    borderTop: index > 0 ? '1px solid var(--color-border-light)' : 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {event.projectName}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--color-primary)',
                      color: 'black',
                      textTransform: 'uppercase',
                    }}>
                      {getEventTypeLabel(event.type)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {event.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {event.registrationCount}{event.maxSpots ? `/${event.maxSpots}` : ''} registered
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {formatTimeRemaining(event.endDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Spacer to push footer down */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ marginTop: '16px', paddingLeft: '4px', paddingRight: '4px' }}>
        <div style={{ fontSize: '11px', color: '#404040' }}>
          &copy; 2026 Korus. All rights reserved.
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
