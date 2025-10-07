'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';

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

  // Close modal when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

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
      name: 'Search',
      path: '/search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Mobile Menu */}
      <div className="fixed top-0 left-0 bottom-0 w-80 bg-korus-dark-200 border-r border-korus-border z-50 md:hidden overflow-y-auto">
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-korus-surface/20 border border-korus-borderLight">
              <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">
                  {publicKey.toBase58().slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-korus-text font-medium text-sm">You</div>
                <div className="text-korus-textSecondary text-xs">
                  {publicKey.toBase58().slice(0, 8)}...
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