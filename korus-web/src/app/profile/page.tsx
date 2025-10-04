'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';

interface NFTAvatar {
  id: string;
  name: string;
  image: string;
  uri: string;
  collection?: string;
}

interface UserStats {
  posts: number;
  replies: number;
  likes: number;
  tips: number;
  repScore: number;
}

interface Post {
  id: number;
  content: string;
  likes: number;
  tips: number;
  replies?: any[];
  imageUrl?: string;
  videoUrl?: string;
}

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showSNSDropdown, setShowSNSDropdown] = useState(false);
  const [hasSetUsername, setHasSetUsername] = useState(false);
  const [userTier, setUserTier] = useState<string>('standard');
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showTipSuccessModal, setShowTipSuccessModal] = useState(false);
  const [tipSuccessData, setTipSuccessData] = useState<{ amount: number; username: string } | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Mock wallet and user data (replace with actual context/API later)
  const walletAddress = publicKey?.toBase58() || '';
  const balance = 5.25; // Mock balance
  const selectedAvatar = '🎮'; // Mock avatar
  const selectedNFTAvatar: NFTAvatar | null = null;
  const snsDomain = null; // Mock SNS domain
  const allSNSDomains: any[] = []; // Mock SNS domains
  const isPremium = false; // Mock premium status
  const timeFunUsername = null;

  let tempUsernameValue = '';
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Calculate stats
  const stats: UserStats = {
    posts: userPosts.length,
    replies: userPosts.reduce((sum, post) => sum + (post.replies?.length || 0), 0),
    likes: userPosts.reduce((sum, post) => sum + post.likes, 0),
    tips: userPosts.reduce((sum, post) => sum + post.tips, 0),
    repScore: 0
  };

  // Calculate reputation score
  stats.repScore = stats.posts * 10 + stats.replies * 5 + stats.likes * 2 + stats.tips * 20;
  if (isPremium) {
    stats.repScore = Math.floor(stats.repScore * 1.2);
  }

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
      return;
    }

    // Load user profile data
    if (!hasLoadedProfile) {
      setHasLoadedProfile(true);
      loadUserProfile();
    }
  }, [connected, hasLoadedProfile, router]);

  const loadUserProfile = async () => {
    try {
      // Load username from localStorage
      const savedUsername = localStorage.getItem('korus_username');
      if (savedUsername) {
        setCurrentUsername(savedUsername);
        setHasSetUsername(true);
      }

      // TODO: Implement API call to load user profile
      console.log('Loading user profile...');
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const validateUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9]{3,20}$/;

    if (!username) {
      return 'Username is required';
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 20) {
      return 'Username cannot exceed 20 characters';
    }
    if (!regex.test(username)) {
      return 'Username can only contain letters and numbers';
    }
    if (username.toLowerCase().endsWith('sol')) {
      return 'Usernames ending with "sol" are reserved';
    }
    return '';
  };

  const handleSaveUsername = async () => {
    const usernameToSave = tempUsernameValue || '';

    const error = validateUsername(usernameToSave);
    if (error) {
      setUsernameError(error);
      return;
    }

    setSavingUsername(true);
    try {
      // Save username to localStorage
      localStorage.setItem('korus_username', usernameToSave);

      // TODO: Implement API call to save username
      setCurrentUsername(usernameToSave);
      setHasSetUsername(true);
      setEditingUsername(false);
      tempUsernameValue = '';
      alert('Username updated successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update username';
      alert(errorMessage);
    } finally {
      setSavingUsername(false);
    }
  };

  const displayName = snsDomain || currentUsername || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

  const handleCopyWallet = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangeAvatar = () => {
    // TODO: Implement avatar change modal
    console.log('Change avatar clicked');
  };

  if (!connected) {
    return null;
  }

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>

      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px] animate-float" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px] animate-pulse-slow" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Main Content Container with sidebar layout */}
        <div className="flex min-h-screen">
          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10">
              <div className="flex items-center px-4 py-4">
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-korus-surface/20 rounded-full transition-colors mr-3"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-white">Profile</h1>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {/* Profile Header */}
              <div className="mb-8">
                {/* Balance Card */}
                <div className="flex justify-end mb-6">
                  <div className="bg-gradient-to-r from-korus-primary to-korus-secondary rounded-xl px-4 py-2 shadow-lg shadow-korus-primary/20">
                    <span className="text-black font-bold">{balance.toFixed(2)} SOL</span>
                  </div>
                </div>

                {/* Avatar and Basic Info */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative mb-4">
                    <button
                      onClick={handleChangeAvatar}
                      className="relative group"
                    >
                      <div className="w-24 h-24 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-3xl font-bold text-black border-4 border-transparent shadow-lg shadow-korus-primary/20">
                        {selectedNFTAvatar ? (
                          <img
                            src={selectedNFTAvatar.image || selectedNFTAvatar.uri}
                            alt="NFT Avatar"
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : selectedAvatar ? (
                          <span>{selectedAvatar}</span>
                        ) : (
                          <span>{walletAddress.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 w-7 h-7 bg-korus-primary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/30 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                    </button>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h2 className={`text-2xl font-bold ${snsDomain ? 'text-korus-primary' : 'text-white'}`}>
                        {displayName}
                      </h2>
                      {isPremium && (
                        <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-korus-textTertiary text-sm font-mono">{walletAddress}</span>
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
                  </div>
                </div>

                {/* Username Section */}
                {!snsDomain && (
                  <div className="mb-6 bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">Username</h3>

                    {!editingUsername ? (
                      <button
                        onClick={() => {
                          const isActuallyPremium = isPremium || userTier === 'premium' || userTier === 'vip';
                          const canEdit = !hasSetUsername || isActuallyPremium;

                          if (!canEdit) {
                            alert('You have already set your username. Upgrade to Premium to change it anytime!');
                            return;
                          }

                          if (!currentUsername && !isActuallyPremium) {
                            const confirmed = confirm('As a free user, you can only set your username ONCE. Choose wisely! Premium users can change their username anytime.');
                            if (!confirmed) return;
                          }

                          setEditingUsername(true);
                          setUsernameError('');
                          tempUsernameValue = currentUsername || '';
                          setTimeout(() => {
                            if (usernameInputRef.current) {
                              usernameInputRef.current.value = currentUsername || '';
                            }
                          }, 50);
                        }}
                        className="w-full bg-korus-surface/40 border border-korus-borderLight rounded-xl p-4 hover:border-korus-border transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {currentUsername ? (
                            <span className="text-white">@{currentUsername}</span>
                          ) : (
                            <span className="text-korus-textTertiary">Set your username</span>
                          )}
                          {hasSetUsername && userTier !== 'premium' && userTier !== 'vip' ? (
                            <svg className="w-4 h-4 text-korus-textTertiary ml-auto" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-korus-textTertiary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          ref={usernameInputRef}
                          type="text"
                          defaultValue={currentUsername || ''}
                          onChange={(e) => {
                            const cleanedText = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                            if (cleanedText !== e.target.value) {
                              e.target.value = cleanedText;
                            }
                            tempUsernameValue = cleanedText;
                          }}
                          placeholder="Enter username (3-20 chars, letters/numbers)"
                          className="w-full bg-korus-surface/40 text-white border border-korus-borderLight rounded-lg px-3 py-2 placeholder-korus-textTertiary focus:outline-none focus:border-korus-border"
                          autoCapitalize="none"
                          maxLength={20}
                          autoCorrect="false"
                        />
                        {usernameError && (
                          <p className="text-red-400 text-sm">{usernameError}</p>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              tempUsernameValue = '';
                              setEditingUsername(false);
                              setUsernameError('');
                            }}
                            className="flex-1 px-4 py-2 border border-korus-borderLight rounded-lg text-korus-textTertiary hover:border-korus-border transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveUsername}
                            disabled={savingUsername || !!usernameError}
                            className="flex-1 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-4 py-2 rounded-lg disabled:opacity-50 hover:shadow-lg hover:shadow-korus-primary/30 transition-all"
                          >
                            {savingUsername ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tabs */}
                <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-1 mb-6">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        activeTab === 'posts'
                          ? 'bg-korus-primary/20 text-korus-primary'
                          : 'text-korus-textTertiary hover:text-white'
                      }`}
                    >
                      Posts ({stats.posts})
                    </button>
                    <button
                      onClick={() => setActiveTab('replies')}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        activeTab === 'replies'
                          ? 'bg-korus-primary/20 text-korus-primary'
                          : 'text-korus-textTertiary hover:text-white'
                      }`}
                    >
                      Replies ({stats.replies})
                    </button>
                  </div>
                </div>

                {/* Reputation Score Card */}
                <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/20">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 2l2 2h8l2-2 2 2-2 2v8l2 2-2 2-2-2H8l-2 2-2-2 2-2V6l-2-2 2-2zm1 2v16h10V4H7z"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white">Reputation Score</h3>
                    </div>
                    <div className="text-4xl font-bold text-korus-primary mb-4">{stats.repScore}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-korus-borderLight/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <span className="text-korus-textSecondary text-sm">Posts created</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.posts * 10}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-korus-borderLight/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span className="text-korus-textSecondary text-sm">Replies made</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.replies * 5}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-korus-borderLight/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                        <span className="text-korus-textSecondary text-sm">Likes received</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.likes * 2}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                        </svg>
                        <span className="text-korus-textSecondary text-sm">Tips received</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.tips * 20}</span>
                    </div>
                  </div>

                  {isPremium && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-korus-borderLight/30">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-yellow-400 text-sm font-medium">+20% Premium Bonus</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Posts Content */}
              <div className="space-y-4">
                {userPosts.length === 0 ? (
                  <div className="text-center py-12 bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl">
                    <p className="text-korus-textTertiary">
                      {activeTab === 'posts' ? 'No posts yet' : 'No replies yet'}
                    </p>
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <div key={post.id} className="bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6 hover:border-korus-border transition-all group">
                      <p className="text-white mb-4">{post.content}</p>
                      {post.imageUrl && (
                        <img src={post.imageUrl} alt="Post image" className="w-full rounded-lg mb-4" />
                      )}
                      <div className="flex items-center gap-6 text-korus-textTertiary text-sm">
                        <span>{post.likes} likes</span>
                        <span>{post.tips} tips</span>
                        <span>{post.replies?.length || 0} replies</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <LeftSidebar />
      <RightSidebar />
    </main>
  );
}