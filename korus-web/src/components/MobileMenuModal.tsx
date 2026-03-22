'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import Image from 'next/image';
import { nftsAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface TabItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
}

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsToggle?: () => void;
}

export default function MobileMenuModal({ isOpen, onClose, onNotificationsToggle }: MobileMenuModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { token, isAuthenticated } = useAuthStore();
  const modalRef = useFocusTrap(isOpen);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Close modal when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Fetch user avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (connected && publicKey && isAuthenticated && token) {
        try {
          const url = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`;
          const userResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user?.nftAvatar) {
              // Check if it's a URL (old data) or mint address (new data)
              const isUrl = userData.user.nftAvatar.startsWith('http://') || userData.user.nftAvatar.startsWith('https://');
              if (isUrl) {
                setUserAvatar(userData.user.nftAvatar);
              } else {
                // It's a mint address, fetch the NFT image
                const nft = await nftsAPI.getNFTByMint(userData.user.nftAvatar);
                if (nft?.image) {
                  setUserAvatar(nft.image);
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch user avatar:', error);
        }
      }
    };

    fetchUserAvatar();
  }, [connected, publicKey, isAuthenticated, token]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs: TabItem[] = [
    {
      name: 'Home',
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z"/>
        </svg>
      ),
    },
    {
      name: 'Notifications',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
      badge: 2,
      onClick: onNotificationsToggle,
    },
    {
      name: 'Messages',
      path: '#',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      disabled: true,
    },
    {
      name: 'Wallet',
      path: '/wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const handleNavigation = (tab: TabItem) => {
    if (tab.onClick && !tab.disabled) {
      tab.onClick();
    } else if (tab.path && !tab.disabled) {
      router.push(tab.path);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Mobile Menu */}
      <div ref={modalRef} className="modal-content fixed top-0 left-0 bottom-0 w-80 bg-korus-dark-200 border-r border-korus-border z-50 md:hidden overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-korus-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">K</span>
            </div>
            <span className="text-white text-xl font-bold">Korus</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path && !tab.disabled;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.name}
                onClick={() => handleNavigation(tab)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  isDisabled
                    ? 'text-korus-textSecondary opacity-60 cursor-not-allowed'
                    : isActive
                    ? 'bg-korus-primary text-black shadow-lg shadow-korus-primary/40'
                    : 'text-korus-textSecondary hover:bg-korus-surface/40 hover:text-korus-text'
                }`}
              >
                <div className={`transition-colors ${
                  isDisabled
                    ? 'text-korus-textSecondary'
                    : isActive
                    ? 'text-black'
                    : 'text-korus-textSecondary'
                }`}>
                  {tab.icon}
                </div>

                <span className={`font-medium flex-1 ${
                  isDisabled
                    ? 'text-korus-textSecondary'
                    : isActive
                    ? 'text-black'
                    : 'text-korus-textSecondary'
                }`}>
                  {tab.name}
                  {isDisabled && (
                    <span className="text-xs text-korus-textTertiary block">Coming Soon</span>
                  )}
                </span>

                {/* Badge */}
                {tab.badge && tab.badge > 0 && !isDisabled && (
                  <span className="bg-korus-primary text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile Section */}
        {connected && publicKey && (
          <div className="p-4 border-t border-korus-border mt-auto">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-korus-primary/10 to-korus-secondary/10 border border-korus-primary/30">
              {userAvatar ? (
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden shadow-lg shadow-korus-primary/20">
                  <Image
                    src={userAvatar}
                    alt="Your avatar"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/20">
                  <span className="text-black font-bold text-sm">
                    {publicKey.toBase58().slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-korus-textSecondary text-xs mb-1">Connected with:</div>
                <div className="text-korus-primary font-mono text-xs font-semibold truncate">
                  {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-t border-korus-border">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/games')}
              className="flex items-center justify-center gap-2 p-3 bg-korus-surface/40 border border-korus-borderLight rounded-xl text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Games</span>
            </button>
            <button
              onClick={() => router.push('/events')}
              className="flex items-center justify-center gap-2 p-3 bg-korus-surface/40 border border-korus-borderLight rounded-xl text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">Events</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}