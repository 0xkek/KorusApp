'use client';

interface FeedHeaderProps {
  feedTab: 'home' | 'following';
  onFeedTabChange: (tab: 'home' | 'following') => void;
  onMobileMenuOpen: () => void;
  onSearchOpen: () => void;
}

export default function FeedHeader({ feedTab, onFeedTabChange, onMobileMenuOpen, onSearchOpen }: FeedHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)]">
      {/* Mobile controls row */}
      <div className="flex md:hidden items-center justify-between px-2">
        <button
          onClick={onMobileMenuOpen}
          aria-label="Open mobile menu"
          className="flex items-center justify-center w-12 h-12 text-white hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="w-6 h-6 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
          <span className="text-black font-bold text-xs">K</span>
        </div>

        <button
          onClick={onSearchOpen}
          aria-label="Open search"
          className="flex items-center justify-center w-12 h-12 text-white hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex">
        <button
          onClick={() => onFeedTabChange('home')}
          className={`flex-1 text-center py-4 text-[14px] font-semibold cursor-pointer transition-colors relative ${feedTab === 'home' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]'}`}
        >
          Home
          {feedTab === 'home' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40px] h-[3px] rounded-[3px] bg-[var(--korus-primary)]" />}
        </button>
        <button
          onClick={() => onFeedTabChange('following')}
          className={`flex-1 text-center py-4 text-[14px] font-semibold cursor-pointer transition-colors duration-150 relative ${feedTab === 'following' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]'}`}
        >
          Following
          {feedTab === 'following' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40px] h-[3px] rounded-[3px] bg-[var(--korus-primary)]" />}
        </button>
        <button
          className="flex-1 text-center py-4 text-[14px] font-semibold cursor-pointer transition-colors duration-150 relative text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]"
        >
          Trending
        </button>
      </div>
    </div>
  );
}
