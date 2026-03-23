'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { GamesPage as GamesContent } from '@/components/games/GamesPage';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });

export default function GamesPage() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#171717]/25 to-[#111111]/35" />
      </div>
      {/* Static gradient orbs for visual depth */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        {/* Secondary gradient orb */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
        {/* Accent orb for depth */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0 border-x border-white/10">

            {/* Header Navigation */}
            <div className="sticky top-0 bg-[#171717]/80 backdrop-blur-xl border-b border-white/10 z-10">
              <div className="flex">
                {/* Mobile menu button */}
                <button
                  onClick={() => setShowMobileMenu(true)}
                  aria-label="Open mobile menu"
                  className="md:hidden flex items-center justify-center w-12 h-12 text-[#fafafa] hover:bg-white/[0.04] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Logo on mobile */}
                <div className="md:hidden flex items-center px-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">K</span>
                  </div>
                </div>

                <div className="relative flex items-center justify-center w-full">
                  <button
                    onClick={() => router.push('/')}
                    className="relative px-4 py-4 text-[#a1a1a1] font-semibold hover:bg-white/[0.04] hover:text-[#fafafa] transition-colors group"
                  >
                    <span className="relative z-10">Home</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/games')}
                    className="relative px-4 py-4 text-[#fafafa] font-semibold hover:bg-white/[0.04] transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-korus-primary rounded-full"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-[#a1a1a1] font-semibold hover:bg-white/[0.04] hover:text-[#fafafa] transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                </div>

                {/* Mobile search/menu */}
                <button
                  onClick={() => setShowSearchModal(true)}
                  aria-label="Open search"
                  className="md:hidden flex items-center justify-center w-12 h-12 text-[#fafafa] hover:bg-white/[0.04] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <GamesContent />
          </div>

          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={[]}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={() => {
          setShowCreatePostModal(false);
        }}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}