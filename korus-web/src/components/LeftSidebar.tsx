'use client';
import { logger } from '@/utils/logger';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import Image from 'next/image';
import { nftsAPI } from '@/lib/api';

interface TabItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
}

interface LeftSidebarProps {
  onNotificationsToggle?: () => void;
  onPostButtonClick?: () => void;
  onSearchClick?: () => void;
  notificationCount?: number; // Add prop for dynamic notification count
}

export default function LeftSidebar({ onNotificationsToggle, onPostButtonClick, onSearchClick, notificationCount = 0 }: LeftSidebarProps) {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  // Fetch user avatar and display name
  useEffect(() => {
    const fetchUserAvatar = async () => {
      logger.log('[LeftSidebar] fetchUserAvatar called', { connected, publicKey: publicKey?.toBase58(), isAuthenticated, hasToken: !!token });
      if (connected && publicKey && isAuthenticated && token) {
        try {
          const url = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`;
          logger.log('[LeftSidebar] Fetching user data from:', url);
          const userResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          logger.log('[LeftSidebar] User response status:', userResponse.status);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            logger.log('[LeftSidebar] User data:', userData);
            // Set display name from profile data
            const snsVal = userData.user?.snsUsername;
            const displayName = (snsVal && snsVal !== '__wallet__') ? snsVal : userData.user?.username || null;
            setUserDisplayName(displayName);

            if (userData.user?.nftAvatar) {
              logger.log('[LeftSidebar] nftAvatar found:', userData.user.nftAvatar);
              // Check if it's a URL (old data) or mint address (new data)
              const isUrl = userData.user.nftAvatar.startsWith('http://') || userData.user.nftAvatar.startsWith('https://');
              logger.log('[LeftSidebar] Is URL?', isUrl);
              if (isUrl) {
                logger.log('[LeftSidebar] Setting avatar URL:', userData.user.nftAvatar);
                setUserAvatar(userData.user.nftAvatar);
              } else {
                // It's a mint address, fetch the NFT image
                logger.log('[LeftSidebar] Fetching NFT by mint:', userData.user.nftAvatar);
                const nft = await nftsAPI.getNFTByMint(userData.user.nftAvatar);
                logger.log('[LeftSidebar] NFT data:', nft);
                if (nft?.image) {
                  logger.log('[LeftSidebar] Setting avatar image:', nft.image);
                  setUserAvatar(nft.image);
                }
              }
            } else {
              logger.log('[LeftSidebar] No nftAvatar in user data');
            }
          }
        } catch (error) {
          logger.error('[LeftSidebar] Failed to fetch user avatar:', error);
        }
      } else {
        logger.log('[LeftSidebar] Not connected, no publicKey, or not authenticated');
      }
    };

    fetchUserAvatar();
  }, [connected, publicKey, isAuthenticated, token]);

  const tabs: TabItem[] = [
    {
      name: 'Home',
      path: '/',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z"/>
        </svg>
      ),
    },
    {
      name: 'Games',
      path: '/games',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
    {
      name: 'Events',
      path: '/events',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Notifications',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
      badge: notificationCount > 0 ? notificationCount : undefined,
      onClick: onNotificationsToggle,
    },
    {
      name: 'Search',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      onClick: onSearchClick,
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: 'Wallet',
      path: '/wallet',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  // Admin tab — only visible to admin wallets
  const ADMIN_WALLETS = [
    'G4WAtEdLYWpDoxNWKVbd2Pv9LoX2feFSxN7mWUXt3kGG',
    '5S2AgyEURGvr4f4Lk3AJ6ei9U6RTzh2AthQiRwHWsV2L',
  ];
  const walletAddress = publicKey?.toBase58() || '';
  if (ADMIN_WALLETS.includes(walletAddress)) {
    tabs.push({
      name: 'Admin',
      path: '/admin',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    });
  }

  return (
    <nav
      className="sticky top-0 h-screen w-[240px] shrink-0 z-30 hidden md:flex flex-col bg-transparent"
      style={{ padding: '24px 16px', borderRight: '1px solid var(--color-border-light)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-[12px] mb-[32px]">
        <Link href="/" className="flex items-center gap-[10px]" aria-label="Korus Home">
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 18, color: '#000' }}>K</span>
          </div>
          <span
            className="text-white hidden xl:block"
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}
          >
            Korus
          </span>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path && !tab.disabled;
          const isDisabled = tab.disabled;

          const itemStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 15,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 150ms',
            marginBottom: 2,
            position: 'relative',
            textDecoration: 'none',
            border: 'none',
            outline: 'none',
            width: '100%',
            background: isDisabled
              ? 'transparent'
              : isActive
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'transparent',
            color: isDisabled
              ? 'var(--color-text-tertiary)'
              : isActive
              ? 'var(--color-text)'
              : 'var(--color-text-tertiary)',
            fontWeight: isDisabled
              ? 500
              : isActive
              ? 600
              : 500,
            opacity: isDisabled ? 0.5 : 1,
          };

          const iconStyle: React.CSSProperties = {
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 150ms, opacity 150ms',
            opacity: isDisabled ? 0.7 : isActive ? 1 : 0.7,
            color: isActive ? 'var(--color-primary)' : 'currentColor',
          };

          const content = (
            <>
              <div style={iconStyle}>
                {tab.icon}
              </div>

              <span
                className="hidden xl:block"
                style={{
                  fontSize: 15,
                  color: isDisabled
                    ? 'var(--color-text-tertiary)'
                    : isActive
                    ? 'var(--color-text)'
                    : 'var(--color-text-tertiary)',
                  fontWeight: isDisabled
                    ? 500
                    : isActive
                    ? 600
                    : 500,
                }}
              >
                {tab.name}
                {isDisabled && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block' }}>Coming Soon</span>
                )}
              </span>

              {/* Badge */}
              {tab.badge && tab.badge > 0 && !isDisabled && (
                <span
                  className="hidden xl:inline-flex xl:items-center xl:justify-center ml-auto"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    lineHeight: '1',
                    fontFamily: 'monospace',
                  }}
                  id={`${tab.name}-badge`}
                  aria-label={`${tab.badge > 9 ? 'More than 9' : tab.badge} unread notifications`}
                >
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </>
          );

          const hoverHandlers = !isDisabled && !isActive ? {
            onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 5%, transparent)';
              e.currentTarget.style.color = 'var(--color-text)';
              // Update icon opacity
              const iconEl = e.currentTarget.querySelector('[data-icon]') as HTMLElement;
              if (iconEl) iconEl.style.opacity = '1';
              // Update label color
              const labelEl = e.currentTarget.querySelector('[data-label]') as HTMLElement;
              if (labelEl) labelEl.style.color = 'var(--color-text)';
            },
            onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-tertiary)';
              const iconEl = e.currentTarget.querySelector('[data-icon]') as HTMLElement;
              if (iconEl) iconEl.style.opacity = '0.7';
              const labelEl = e.currentTarget.querySelector('[data-label]') as HTMLElement;
              if (labelEl) labelEl.style.color = 'var(--color-text-tertiary)';
            },
          } : {};

          // Re-render content with data attributes for hover targeting
          const contentWithAttrs = (
            <>
              <div style={iconStyle} data-icon="">
                {tab.icon}
              </div>

              <span
                className="hidden xl:block"
                data-label=""
                style={{
                  fontSize: 15,
                  color: isDisabled
                    ? 'var(--color-text-tertiary)'
                    : isActive
                    ? 'var(--color-text)'
                    : 'var(--color-text-tertiary)',
                  fontWeight: isDisabled
                    ? 500
                    : isActive
                    ? 600
                    : 500,
                }}
              >
                {tab.name}
                {isDisabled && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block' }}>Coming Soon</span>
                )}
              </span>

              {/* Badge */}
              {tab.badge && tab.badge > 0 && !isDisabled && (
                <span
                  className="hidden xl:inline-flex xl:items-center xl:justify-center ml-auto"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    lineHeight: '1',
                    fontFamily: 'monospace',
                  }}
                  id={`${tab.name}-badge`}
                  aria-label={`${tab.badge > 9 ? 'More than 9' : tab.badge} unread notifications`}
                >
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </>
          );

          if (tab.onClick && !isDisabled) {
            return (
              <button
                key={tab.name}
                onClick={tab.onClick}
                style={itemStyle}
                aria-label={tab.name}
                aria-describedby={tab.badge ? `${tab.name}-badge` : undefined}
                {...hoverHandlers}
              >
                {contentWithAttrs}
              </button>
            );
          }

          if (isDisabled) {
            return (
              <div
                key={tab.name}
                style={itemStyle}
                role="button"
                aria-disabled="true"
                aria-label={`${tab.name} (Coming Soon)`}
                title={`${tab.name} - Coming Soon`}
                className="group"
              >
                {contentWithAttrs}
                {/* Tooltip on hover */}
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[var(--color-surface-light)] border border-[var(--color-border-light)] text-[var(--color-text)] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap">
                  Feature coming soon
                </div>
              </div>
            );
          }

          return (
            <Link
              key={tab.name}
              href={tab.path || '#'}
              style={itemStyle}
              aria-label={tab.name}
              aria-current={isActive ? 'page' : undefined}
              {...hoverHandlers}
            >
              {contentWithAttrs}
            </Link>
          );
        })}
      </div>

      {/* Post Button */}
      {connected && onPostButtonClick && (
        <div style={{ paddingTop: 20 }}>
          <button
            onClick={onPostButtonClick}
            style={{
              width: '100%',
              background: 'linear-gradient(to right, var(--korus-primary), var(--korus-secondary))',
              color: '#000',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 14,
              padding: 14,
              textAlign: 'center' as const,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 25px color-mix(in srgb, var(--korus-primary) 30%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>Post</span>
          </button>
        </div>
      )}

      {/* User Profile */}
      {connected && publicKey && (
        <div
          className="mt-auto"
          style={{
            padding: 12,
            borderRadius: 12,
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 5%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Link href="/profile" className="flex items-center gap-[10px]" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'all 150ms' }}>
            {userAvatar ? (
              <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden' }}>
                <Image
                  src={userAvatar}
                  alt="Your avatar"
                  width={38}
                  height={38}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--korus-primary), var(--korus-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#000', fontWeight: 700, fontSize: 12 }}>
                  {publicKey.toBase58().slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="hidden xl:block flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{userDisplayName || `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </div>
            </div>
          </Link>
        </div>
      )}
    </nav>
  );
}
