'use client';

import Image from 'next/image';
import type { UserProfile } from '@/lib/api/users';

interface ProfileHeaderProps {
  displayName: string;
  profileUser: UserProfile | null;
  profileWallet: string;
  resolvedAvatar: string | null;
  isPremium: boolean;
  isOwnProfile: boolean;
  connected: boolean;
  isFollowing: boolean;
  isFollowLoading: boolean;
  followerCount: number;
  followingCount: number;
  reputationScore: number;
  copied: boolean;
  activeTab: 'posts' | 'replies';
  postCount: number;
  onToggleFollow: () => void;
  onTipUser: () => void;
  onCopyWallet: () => void;
  onTabChange: (tab: 'posts' | 'replies') => void;
}

export default function ProfileHeader({
  displayName,
  profileUser,
  profileWallet,
  resolvedAvatar,
  isPremium,
  isOwnProfile,
  connected,
  isFollowing,
  isFollowLoading,
  followerCount,
  followingCount,
  reputationScore,
  copied,
  activeTab,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postCount,
  onToggleFollow,
  onTipUser,
  onCopyWallet,
  onTabChange,
}: ProfileHeaderProps) {
  return (
    <>
      {/* Profile Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border-light)]">
        {/* Avatar row + action buttons */}
        <div className="flex items-start justify-between mb-3">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden">
            {resolvedAvatar ? (
              <Image src={resolvedAvatar} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center">
                <span className="text-2xl font-bold text-black">{displayName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isOwnProfile && connected && (
              <button
                onClick={onToggleFollow}
                disabled={isFollowLoading}
                className={`px-5 py-2 rounded-full font-bold text-sm transition-all duration-150 ${
                  isFollowing
                    ? 'bg-transparent text-[var(--color-text)] border border-[var(--color-border-light)] hover:border-red-500/50 hover:text-red-400'
                    : 'bg-[var(--color-text)] text-[var(--color-background)] hover:opacity-90'
                }`}
              >
                {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            {!isOwnProfile && (
              <button
                onClick={onTipUser}
                className="p-2 rounded-full border border-[var(--color-border-light)] hover:bg-white/[0.04] transition-colors"
                title="Tip this user"
              >
                <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Name + badge */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{displayName}</h2>
          {isPremium && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
              <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
              </svg>
            </div>
          )}
        </div>

        {/* @username / wallet */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[14px] text-[var(--color-text-secondary)]">
            @{profileUser?.username || profileUser?.snsUsername || `${profileWallet.slice(0, 6)}...${profileWallet.slice(-4)}`}
          </span>
          <button
            onClick={onCopyWallet}
            className="text-[12px] text-[var(--color-text-tertiary)] font-mono flex items-center gap-1 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            {profileWallet.slice(0, 4)}...{profileWallet.slice(-4)}
            {copied ? (
              <svg className="w-3.5 h-3.5 text-korus-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            )}
          </button>
        </div>

        {/* Bio */}
        {profileUser?.bio && (
          <p className="text-[15px] text-[var(--color-text)] mb-3 whitespace-pre-wrap">{profileUser.bio}</p>
        )}

        {/* Follower / Following + Rep */}
        <div className="flex items-center gap-4 text-[14px]">
          <span>
            <strong className="text-[var(--color-text)]">{followingCount}</strong>
            <span className="text-[var(--color-text-tertiary)] ml-1">Following</span>
          </span>
          <span>
            <strong className="text-[var(--color-text)]">{followerCount}</strong>
            <span className="text-[var(--color-text-tertiary)] ml-1">Followers</span>
          </span>
          {reputationScore > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/></svg>
              <strong className="text-[var(--color-text)]">{reputationScore}</strong>
              <span className="text-[var(--color-text-tertiary)]">Rep</span>
            </span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[var(--color-border-light)]">
        <button
          onClick={() => onTabChange('posts')}
          className={`flex-1 py-3.5 text-[14px] font-semibold text-center relative transition-colors ${
            activeTab === 'posts' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.03]'
          }`}
        >
          Posts
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-korus-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => onTabChange('replies')}
          className={`flex-1 py-3.5 text-[14px] font-semibold text-center relative transition-colors ${
            activeTab === 'replies' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.03]'
          }`}
        >
          Replies
          {activeTab === 'replies' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-korus-primary rounded-full" />
          )}
        </button>
      </div>
    </>
  );
}
