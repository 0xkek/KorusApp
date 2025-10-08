'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';

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
  notificationCount?: number; // Add prop for dynamic notification count
}

export default function LeftSidebar({ onNotificationsToggle, onPostButtonClick, notificationCount = 0 }: LeftSidebarProps) {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();

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
      badge: notificationCount > 0 ? notificationCount : undefined, // Use dynamic count, hide if 0
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

  return (
    <nav className="fixed left-0 top-0 bottom-0 lg:w-80 md:w-64 sm:w-16 z-30 border-r border-korus-border bg-black px-4 flex flex-col hidden md:flex" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="py-4">
        <Link href="/" className="flex items-center gap-3 p-3 rounded-full hover:bg-korus-surface/40 transition-all duration-200" aria-label="Korus Home">
          <div className="w-8 h-8 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-sm">K</span>
          </div>
          <span className="text-white text-xl font-bold">Korus</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-2 flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path && !tab.disabled;
          const isDisabled = tab.disabled;
          const className = `flex items-center gap-4 px-3 py-3 rounded-full transition-all duration-200 relative group ${
            isDisabled
              ? 'text-korus-textSecondary opacity-50 cursor-not-allowed bg-korus-surface/10 border border-korus-borderLight border-dashed'
              : isActive
              ? 'bg-korus-primary shadow-lg shadow-korus-primary/40'
              : 'text-korus-textSecondary hover:bg-korus-surface/40 hover:text-korus-text'
          }`;

          const content = (
            <>
              <div className={`transition-colors ${
                isDisabled
                  ? 'text-korus-textSecondary'
                  : isActive
                  ? 'text-black'
                  : 'text-korus-textSecondary group-hover:text-korus-text'
              }`}>
                {tab.icon}
              </div>

              <span className={`text-xl font-medium hidden xl:block ${
                isDisabled
                  ? 'text-korus-textSecondary'
                  : isActive
                  ? 'text-black'
                  : 'text-korus-textSecondary group-hover:text-korus-text'
              }`}>
                {tab.name}
                {isDisabled && (
                  <span className="text-xs text-korus-textTertiary block">Coming Soon</span>
                )}
              </span>

              {/* Badge */}
              {tab.badge && tab.badge > 0 && !isDisabled && (
                <span
                  className="bg-korus-primary text-black font-bold rounded-full w-6 h-6 hidden xl:flex xl:items-center xl:justify-center ml-auto"
                  style={{fontSize: '14px', lineHeight: '1', fontFamily: 'monospace'}}
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
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-korus-surface border border-korus-border text-korus-text text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
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
        <div className="px-3 pb-4">
          <button
            onClick={onPostButtonClick}
            className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-full py-3 px-6 hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden xl:block">Post</span>
          </button>
        </div>
      )}

      {/* User Profile */}
      {connected && publicKey && (
        <div className="py-4 border-t border-korus-border">
          <div className="flex items-center gap-3 p-3 rounded-full hover:bg-korus-surface/40 transition-all duration-200 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">
                {publicKey.toBase58().slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="hidden xl:block">
              <div className="text-korus-text font-medium text-sm">You</div>
              <div className="text-korus-textSecondary text-xs">
                {publicKey.toBase58().slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
