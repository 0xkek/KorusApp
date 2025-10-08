'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import dynamic from 'next/dynamic';
import { fetchSNSDomains, getFavoriteSNSDomain, SNSDomain } from '@/utils/sns';
import type { Post, UserStats } from '@/types/post';

const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileWallet = params.wallet as string;

  const [userPosts] = useState<Post[]>([]);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snsDomains, setSnsDomains] = useState<SNSDomain[]>([]);
  const [favoriteDomain, setFavoriteDomain] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  // Mock user data for the profile being viewed
  const userInfo = {
    wallet: profileWallet,
    username: null, // Could fetch from API
    avatar: '👤',
    isPremium: false,
  };

  // Calculate stats
  const stats: UserStats = useMemo(() => {
    const postsCount = userPosts.length;
    const tipsReceived = userPosts.reduce((sum, post) => sum + post.tips, 0);
    // Mock tips given based on activity (would come from actual data)
    const tipsGiven = Math.max(1, Math.floor(postsCount * 2.5));
    // Calculate replies count (sum of reply counts from all posts)
    const repliesCount = userPosts.reduce((sum, post) => sum + post.replies, 0);

    // Calculate reputation score
    let repScore = 0;
    repScore += postsCount * 10;
    repScore += tipsReceived * 20;
    repScore += tipsGiven * 15;

    if (userInfo.isPremium) {
      repScore = Math.floor(repScore * 1.2);
    }

    return {
      posts: postsCount,
      replies: repliesCount,
      tipsReceived,
      tipsGiven,
      repScore
    };
  }, [userPosts, userInfo.isPremium]);

  const displayName = userInfo.username || `${profileWallet.slice(0, 4)}...${profileWallet.slice(-4)}`;

  // Fetch SNS domains on mount
  useEffect(() => {
    if (profileWallet) {
      fetchSNSDomains(profileWallet).then(domains => {
        setSnsDomains(domains);
      });
      getFavoriteSNSDomain(profileWallet).then(domain => {
        setFavoriteDomain(domain);
      });
    }
  }, [profileWallet]);

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(profileWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>

      {/* Static gradient orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        <div className="flex min-h-screen">
          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10">
              <div className="flex items-center px-4 py-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-korus-surface/20 rounded-full transition-colors mr-3"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-white">Profile</h1>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {/* Profile Header */}
              <div className="mb-8">
                {/* Avatar and Basic Info */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative mb-4">
                    <div className="w-32 h-32 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-5xl font-bold text-black shadow-lg shadow-korus-primary/20 border-4 border-transparent">
                      <span>{userInfo.avatar}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    {/* Favorite SNS Domain or Username */}
                    {favoriteDomain ? (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <h2 className="text-2xl font-bold text-korus-primary" style={{ textShadow: '0 0 12px rgba(67, 233, 123, 0.4)' }}>
                            {favoriteDomain}
                          </h2>
                          {userInfo.isPremium && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-yellow-400">
                              <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                                <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-korus-text text-base mb-2">@{displayName}</p>
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold text-white">
                          {displayName}
                        </h2>
                        {userInfo.isPremium && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center bg-yellow-400">
                            <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Premium/Basic Badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        userInfo.isPremium
                          ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                          : 'bg-korus-surface/40 text-korus-textSecondary border border-korus-borderLight'
                      }`}>
                        {userInfo.isPremium ? (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                            </svg>
                            Premium
                          </>
                        ) : (
                          'Basic'
                        )}
                      </span>
                    </div>

                    {/* Wallet Address */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-korus-textTertiary text-xs font-mono" style={{ textShadow: '0 0 8px rgba(67, 233, 123, 0.2)' }}>
                        {profileWallet}
                      </span>
                      <button
                        onClick={handleCopyWallet}
                        className="p-1 hover:bg-korus-surface/20 rounded transition-colors"
                      >
                        {copied ? (
                          <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a1 1 0 011 1v3M9 12l2 2 4-4"/>
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* All SNS Domains */}
                    {snsDomains.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                        {snsDomains.map((domain) => (
                          <span
                            key={domain.domain}
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              domain.favorite
                                ? 'bg-korus-primary/20 text-korus-primary border border-korus-primary/30'
                                : 'bg-korus-surface/30 text-korus-textSecondary border border-korus-borderLight'
                            }`}
                          >
                            {domain.domain}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-korus-primary mb-1">{stats.posts}</div>
                      <div className="text-xs text-korus-textSecondary font-medium">Posts Made</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-korus-primary mb-1">{stats.tipsReceived}</div>
                      <div className="text-xs text-korus-textSecondary font-medium">Tips Received</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-korus-primary mb-1">{stats.tipsGiven}</div>
                      <div className="text-xs text-korus-textSecondary font-medium">Tips Given</div>
                    </div>
                  </div>
                </div>

                {/* Tip Button */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                    Tip User
                  </button>
                </div>

                {/* Reputation Score Card */}
                <div className="bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/20">
                          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 3h12l4 6-10 12L2 9l4-6z"/>
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-korus-textSecondary mb-2">Reputation Score</h3>
                      <div className="text-4xl font-bold text-korus-primary">{stats.repScore}</div>
                      {userInfo.isPremium && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                            </svg>
                          </div>
                          <span className="text-yellow-400 text-xs font-medium">Premium member</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="text-center py-16 bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl">
                  <div className="text-5xl mb-4 opacity-60">🔒</div>
                  <p className="text-korus-text text-lg font-medium mb-2">User activity is private</p>
                  <p className="text-korus-textSecondary text-sm">
                    Posts and replies are only visible to the account owner
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        recipientUser={displayName}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={userPosts}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={() => {
          setShowCreatePostModal(false);
        }}
      />

      <LeftSidebar
        onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        onPostButtonClick={() => setShowCreatePostModal(true)}
        onSearchClick={() => setShowSearchModal(true)}
      />
      <RightSidebar
        showNotifications={showNotifications}
        onNotificationsClose={() => setShowNotifications(false)}
      />
    </main>
  );
}
