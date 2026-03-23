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
      console.log('[LeftSidebar] fetchUserAvatar called', { connected, publicKey: publicKey?.toBase58(), isAuthenticated, hasToken: !!token });
      if (connected && publicKey && isAuthenticated && token) {
        try {
          const url = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`;
          console.log('[LeftSidebar] Fetching user data from:', url);
          const userResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('[LeftSidebar] User response status:', userResponse.status);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('[LeftSidebar] User data:', userData);
            // Set display name from profile data
            const displayName = userData.user?.snsUsername || userData.user?.username || null;
            setUserDisplayName(displayName);

            if (userData.user?.nftAvatar) {
              console.log('[LeftSidebar] nftAvatar found:', userData.user.nftAvatar);
              // Check if it's a URL (old data) or mint address (new data)
              const isUrl = userData.user.nftAvatar.startsWith('http://') || userData.user.nftAvatar.startsWith('https://');
              console.log('[LeftSidebar] Is URL?', isUrl);
              if (isUrl) {
                console.log('[LeftSidebar] Setting avatar URL:', userData.user.nftAvatar);
                setUserAvatar(userData.user.nftAvatar);
              } else {
                // It's a mint address, fetch the NFT image
                console.log('[LeftSidebar] Fetching NFT by mint:', userData.user.nftAvatar);
                const nft = await nftsAPI.getNFTByMint(userData.user.nftAvatar);
                console.log('[LeftSidebar] NFT data:', nft);
                if (nft?.image) {
                  console.log('[LeftSidebar] Setting avatar image:', nft.image);
                  setUserAvatar(nft.image);
                }
              }
            } else {
              console.log('[LeftSidebar] No nftAvatar in user data');
            }
          }
        } catch (error) {
          console.error('[LeftSidebar] Failed to fetch user avatar:', error);
        }
      } else {
        console.log('[LeftSidebar] Not connected, no publicKey, or not authenticated');
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="sticky top-0 h-screen w-[260px] shrink-0 z-30 border-r border-[#2c2c2c] px-[16px] py-[24px] hidden md:flex flex-col bg-transparent" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-[12px] mb-[32px]">
        <Link href="/" className="flex items-center gap-[10px]" aria-label="Korus Home">
          <div className="w-[32px] h-[32px] bg-gradient-to-r from-korus-primary to-korus-secondary rounded-[10px] flex items-center justify-center">
            <span className="text-white font-[800] text-[16px]">K</span>
          </div>
          <span className="text-white text-[20px] font-[800] tracking-[-0.5px] hidden xl:block">Korus</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path && !tab.disabled;
          const isDisabled = tab.disabled;
          const className = `flex items-center gap-[14px] px-[16px] py-[12px] rounded-[12px] text-[15px] cursor-pointer transition-all duration-150 relative group mb-[2px] ${
            isDisabled
              ? 'text-[#888888] opacity-50 cursor-not-allowed'
              : isActive
              ? 'text-[#e8e8e8] font-semibold'
              : 'text-[#888888] font-medium hover:bg-[#252525] hover:text-[#e8e8e8]'
          }`;

          const content = (
            <>
              <div className={`w-[22px] h-[22px] flex items-center justify-center transition-colors ${
                isDisabled
                  ? 'opacity-70'
                  : isActive
                  ? 'opacity-100'
                  : 'opacity-70 group-hover:opacity-100'
              }`}>
                {tab.icon}
              </div>

              <span className={`text-[15px] hidden xl:block ${
                isDisabled
                  ? 'text-[#888888]'
                  : isActive
                  ? 'text-[#e8e8e8] font-semibold'
                  : 'text-[#888888] font-medium group-hover:text-[#e8e8e8]'
              }`}>
                {tab.name}
                {isDisabled && (
                  <span className="text-[11px] text-[#888888]/50 block">Coming Soon</span>
                )}
              </span>

              {/* Badge */}
              {tab.badge && tab.badge > 0 && !isDisabled && (
                <span
                  className="bg-korus-primary text-black font-bold rounded-full w-5 h-5 hidden xl:flex xl:items-center xl:justify-center ml-auto text-xs"
                  style={{lineHeight: '1', fontFamily: 'monospace'}}
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
                className={className}
                aria-label={tab.name}
                aria-describedby={tab.badge ? `${tab.name}-badge` : undefined}
              >
                {content}
              </button>
            );
          }

          if (isDisabled) {
            return (
              <div
                key={tab.name}
                className={`${className} relative`}
                role="button"
                aria-disabled="true"
                aria-label={`${tab.name} (Coming Soon)`}
                title={`${tab.name} - Coming Soon`}
              >
                {content}
                {/* Tooltip on hover */}
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-white/[0.08] border border-white/[0.1] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                  Feature coming soon
                </div>
              </div>
            );
          }

          return (
            <Link
              key={tab.name}
              href={tab.path || '#'}
              className={className}
              aria-label={tab.name}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>

      {/* Post Button */}
      {connected && onPostButtonClick && (
        <div className="mt-auto pt-[20px]">
          <button
            onClick={onPostButtonClick}
            className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black text-[15px] font-bold rounded-[14px] py-[12px] text-center hover:-translate-y-px hover:shadow-xl hover:shadow-korus-primary/35 transition-all duration-200 flex items-center justify-center"
          >
            <span>Post</span>
          </button>
        </div>
      )}

      {/* User Profile */}
      {connected && publicKey && (
        <div className="mt-[12px] p-[14px] rounded-[14px] bg-[#1a1a1a]">
          <Link href="/profile" className="flex items-center gap-[10px] transition-all duration-200 cursor-pointer">
            {userAvatar ? (
              <div className="w-[36px] h-[36px] rounded-[10px] flex-shrink-0 overflow-hidden">
                <Image
                  src={userAvatar}
                  alt="Your avatar"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-[36px] h-[36px] bg-gradient-to-r from-korus-primary to-korus-secondary rounded-[10px] flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-xs">
                  {publicKey.toBase58().slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="hidden xl:block flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white">{userDisplayName || 'korus.sol'}</div>
              <div className="text-[11px] text-[#666666] font-mono truncate">
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </div>
            </div>
          </Link>
        </div>
      )}
    </nav>
  );
}
