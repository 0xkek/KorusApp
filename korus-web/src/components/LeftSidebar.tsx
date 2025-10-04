'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';

interface TabItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function LeftSidebar() {
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
      path: '/notifications',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
      badge: 3,
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-80 z-30 border-r border-korus-border bg-black px-4 flex flex-col">
      {/* Logo */}
      <div className="py-4">
        <Link href="/" className="flex items-center gap-3 p-3 rounded-full hover:bg-gray-800 transition-all duration-200">
          <div className="w-8 h-8 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-sm">K</span>
          </div>
          <span className="text-white text-xl font-bold">Korus</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-2 flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex items-center gap-4 px-3 py-3 rounded-full transition-all duration-200 relative group ${
                isActive
                  ? 'bg-korus-primary shadow-lg shadow-korus-primary/40'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className={`transition-colors ${isActive ? 'text-black' : 'text-gray-300 group-hover:text-white'}`}>
                {tab.icon}
              </div>

              <span className={`text-xl font-medium hidden xl:block ${
                isActive ? 'text-black' : 'text-gray-300 group-hover:text-white'
              }`}>
                {tab.name}
              </span>

              {/* Badge */}
              {tab.badge && tab.badge > 0 && (
                <span className="bg-korus-primary text-black font-bold rounded-full w-6 h-6 hidden xl:flex xl:items-center xl:justify-center ml-auto" style={{fontSize: '14px', lineHeight: '1', fontFamily: 'monospace'}}>
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Post Button */}
      {connected && (
        <div className="py-4">
          <button className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-korus-primary/20 transition-all">
            <span className="hidden xl:block text-black">Post</span>
            <span className="xl:hidden text-black">+</span>
          </button>
        </div>
      )}

      {/* User Profile */}
      {connected && publicKey && (
        <div className="py-4 border-t border-korus-border">
          <div className="flex items-center gap-3 p-3 rounded-full hover:bg-gray-800 transition-all duration-200 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">
                {publicKey.toBase58().slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="hidden xl:block">
              <div className="text-white font-medium text-sm">You</div>
              <div className="text-gray-400 text-xs">
                {publicKey.toBase58().slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
