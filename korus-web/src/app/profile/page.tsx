'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';
import { SafeContent } from '@/components/SafeContent';
import { useAllSNSDomains, useSNSDomain } from '@/hooks/useSNSDomain';
import { setFavoriteSNSDomain } from '@/utils/sns';
import { useToastContext } from '@/components/ToastProvider';
import { useSubscription } from '@/hooks/useSubscription';
import type { Post } from '@/types/post';
import { type NFT } from '@/lib/api';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const NFTAvatarModal = dynamic(() => import('@/components/NFTAvatarModal'), { ssr: false });

interface ReputationBreakdown {
  reputationScore: number;
  contentScore: number;
  engagementScore: number;
  communityScore: number;
  loyaltyScore: number;
  shoutoutScore: number;
  gamesScore: number;
  loginStreak: number;
  recentEvents: Array<{
    id: string;
    eventType: string;
    points: number;
    category: string;
    description?: string;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { showWarning, showSuccess, showError } = useToastContext();
  const router = useRouter();

  // All hooks must be called before any conditional logic
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [copied, setCopied] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showIdentityDropdown, setShowIdentityDropdown] = useState(false);
  const [hasSetUsername, setHasSetUsername] = useState(false);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);
  const [tempUsernameValue, setTempUsernameValue] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [selectedNFTAvatar, setSelectedNFTAvatar] = useState<NFT | null>(null); // NFT avatar
  const [showNFTAvatarModal, setShowNFTAvatarModal] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [dbSnsUsername, setDbSnsUsername] = useState<string | null>(null); // SNS from database
  const [reputation, setReputation] = useState<ReputationBreakdown>({
    reputationScore: 0,
    contentScore: 0,
    engagementScore: 0,
    communityScore: 0,
    loyaltyScore: 0,
    shoutoutScore: 0,
    gamesScore: 0,
    loginStreak: 0,
    recentEvents: [],
  });

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReplies, setUserReplies] = useState<Array<{
    id: string;
    content: string;
    createdAt: string;
    likeCount: number;
    postId: string;
    postContent?: string;
    postAuthor?: string;
  }>>([]);

  // Wallet and user data
  const walletAddress = publicKey?.toBase58() || '';
  const selectedAvatar = '🎮'; // Mock avatar

  // SNS Domain hooks - must be called before any conditional returns
  const { domain: snsDomain, loading: snsLoading, refresh: refreshSNS } = useSNSDomain(walletAddress);
  const { domains: allSNSDomains, loading: allDomainsLoading } = useAllSNSDomains(walletAddress);

  // Subscription status hook
  const { isPremium, refreshStatus, daysUntilExpiration } = useSubscription();

  // Refs for outside click detection
  const snsDropdownRef = useRef<HTMLDivElement>(null);
  const premiumModalRef = useRef<HTMLDivElement>(null);

  // No longer using fake stats — reputation data comes from the backend

  const loadUserProfile = useCallback(async () => {
    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Load profile from API
      const { usersAPI, nftsAPI, reputationAPI, postsAPI, repliesAPI } = await import('@/lib/api');
      const { user } = await usersAPI.getProfile(token);

      // Fetch reputation, posts, and replies in parallel
      if (user.walletAddress) {
        const [repResult, postsResult, repliesResult] = await Promise.allSettled([
          reputationAPI.getReputation(user.walletAddress, token),
          postsAPI.getUserPosts(user.walletAddress, { limit: 50 }),
          repliesAPI.getUserReplies(user.walletAddress, { limit: 50 }),
        ]);

        // Debug: log raw API results
        logger.log('Profile API results:', {
          repStatus: repResult.status,
          postsStatus: postsResult.status,
          repliesStatus: repliesResult.status,
          postsValue: postsResult.status === 'fulfilled' ? { postCount: postsResult.value.posts?.length, hasPostsKey: 'posts' in postsResult.value } : { reason: (postsResult as PromiseRejectedResult).reason?.message },
          repliesValue: repliesResult.status === 'fulfilled' ? { replyCount: repliesResult.value.replies?.length, hasRepliesKey: 'replies' in repliesResult.value, keys: Object.keys(repliesResult.value) } : { reason: (repliesResult as PromiseRejectedResult).reason?.message },
        });

        if (repResult.status === 'fulfilled') {
          const repData = repResult.value.reputation;
          setReputation({
            reputationScore: repData.reputationScore,
            contentScore: repData.contentScore,
            engagementScore: repData.engagementScore,
            communityScore: repData.communityScore,
            loyaltyScore: repData.loyaltyScore,
            shoutoutScore: repData.shoutoutScore || 0,
            gamesScore: repData.gamesScore || 0,
            loginStreak: repData.loginStreak,
            recentEvents: repData.recentEvents || [],
          });
        } else {
          logger.error('Failed to load reputation:', (repResult as PromiseRejectedResult).reason);
        }

        if (postsResult.status === 'fulfilled' && postsResult.value.posts) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformed = postsResult.value.posts.filter((post: any) => post.content?.trim() || post.imageUrl).map((post: any) => ({
            id: post.id,
            user: post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: post.authorWallet,
            content: post.content,
            likes: post.likeCount || 0,
            replies: post.replyCount || 0,
            tips: Number(post.tipAmount) || 0,
            time: new Date(post.createdAt).toLocaleString(),
            createdAt: post.createdAt,
            imageUrl: post.imageUrl,
            avatar: post.author?.nftAvatar || null,
            isPremium: post.author?.tier === 'premium' || post.author?.tier === 'vip',
          }));
          setUserPosts(transformed);
        } else {
          logger.error('Failed to load user posts:', postsResult.status === 'rejected' ? (postsResult as PromiseRejectedResult).reason : postsResult.value);
        }

        if (repliesResult.status === 'fulfilled' && repliesResult.value.replies) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformedReplies = repliesResult.value.replies.map((reply: any) => ({
            id: reply.id,
            content: reply.content,
            createdAt: reply.createdAt,
            likeCount: reply.likeCount || 0,
            postId: reply.postId,
            postContent: reply.post?.content?.slice(0, 100) || '',
            postAuthor: reply.post?.author?.username || reply.post?.author?.snsUsername || reply.post?.authorWallet?.slice(0, 10) || '',
          }));
          setUserReplies(transformedReplies);
        } else {
          logger.error('Failed to load user replies:', repliesResult.status === 'rejected' ? (repliesResult as PromiseRejectedResult).reason : repliesResult.value);
        }
      }

      if (user.username) {
        setCurrentUsername(user.username);
        setHasSetUsername(user.hasSetUsername || false);
      }

      // Load SNS username from database
      if (user.snsUsername) {
        setDbSnsUsername(user.snsUsername);
      }

      // Load NFT avatar if user has one
      if (user.nftAvatar) {
        try {
          // Check if it's a URL (old data) or mint address (new data)
          const isUrl = user.nftAvatar.startsWith('http://') || user.nftAvatar.startsWith('https://');

          if (isUrl) {
            // Old data format: nftAvatar is already a URL
            setSelectedNFTAvatar({
              mint: '', // We don't have the mint address for old data
              name: 'NFT Avatar',
              image: user.nftAvatar,
              uri: user.nftAvatar,
            } as NFT);
          } else {
            // New data format: nftAvatar is a mint address, fetch the NFT
            const nft = await nftsAPI.getNFTByMint(user.nftAvatar);
            if (nft) {
              setSelectedNFTAvatar(nft);
            }
          }
        } catch (error) {
          logger.error('Error loading NFT avatar:', error);
        }
      }

      // Also save to localStorage as backup
      if (user.username && typeof window !== 'undefined') {
        try {
          localStorage.setItem('korus_username', user.username);
        } catch {
          // Continue without saved data
        }
      }
    } catch {
      // Handle error silently or load from localStorage as fallback
      if (typeof window !== 'undefined') {
        try {
          const savedUsername = localStorage.getItem('korus_username');
          if (savedUsername) {
            setCurrentUsername(savedUsername);
            setHasSetUsername(true);
          }
        } catch {
          // Continue without saved data
        }
      }
    }
  }, []);

  const truncatedWallet = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const displayName = useMemo(() => {
    // __wallet__ is a sentinel value meaning "user explicitly chose wallet address"
    if (dbSnsUsername === '__wallet__') return truncatedWallet;
    // Priority: DB SNS username (user's explicit choice) > regular username > wallet address
    return dbSnsUsername || currentUsername || truncatedWallet;
  }, [dbSnsUsername, currentUsername, truncatedWallet]);

  // Fetch wallet balance via server-side RPC proxy (same as wallet page)
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return;
      try {
        const rpcResponse = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [publicKey.toBase58()],
          }),
        });
        const rpcData = await rpcResponse.json();
        if (rpcData.error) throw new Error(rpcData.error.message || 'RPC error');
        const bal = rpcData.result?.value ?? 0;
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (error) {
        logger.error('Failed to fetch balance:', error);
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

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
  }, [connected, hasLoadedProfile, router, loadUserProfile]);

  // Handle identity dropdown outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (snsDropdownRef.current && !snsDropdownRef.current.contains(event.target as Node)) {
        setShowIdentityDropdown(false);
      }
    };

    if (showIdentityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showIdentityDropdown]);

  // Handle premium modal outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (premiumModalRef.current && !premiumModalRef.current.contains(event.target as Node)) {
        setShowPremiumModal(false);
      }
    };

    if (showPremiumModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPremiumModal]);

  // Early return after all hooks are declared
  if (!connected) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-[var(--color-text)]">Redirecting...</div>
      </div>
    );
  }

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
      return 'Usernames ending with "sol" are reserved for SNS domains';
    }
    const reserved = ['admin', 'administrator', 'mod', 'moderator', 'korus', 'korusapp', 'system', 'support', 'anonymous', 'anon', 'null', 'undefined'];
    if (reserved.includes(username.toLowerCase())) {
      return `"${username}" is a reserved platform name and cannot be used`;
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
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Please reconnect your wallet to set username');
        return;
      }

      // Save username via API
      const { usersAPI } = await import('@/lib/api');
      const result = await usersAPI.setUsername({ username: usernameToSave }, token);

      setCurrentUsername(result.username);
      setHasSetUsername(true);
      setEditingUsername(false);
      setTempUsernameValue('');

      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('korus_username', result.username);
        } catch {
          // Continue anyway
        }
      }

      showSuccess('Username set successfully!');
    } catch (error: unknown) {
      const errorMessage = (error as { data?: { error?: string }, message?: string })?.data?.error || (error as Error)?.message || 'Failed to set username';
      showError(errorMessage);
      setUsernameError(errorMessage);
    } finally {
      setSavingUsername(false);
    }
  };

  const handleCopyWallet = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangeAvatar = () => {
    logger.log('Opening NFT avatar modal');
    setShowNFTAvatarModal(true);
  };

  const handleSelectNFT = async (nft: NFT) => {
    logger.log('NFT selected:', nft);
    setSelectedNFTAvatar(nft);

    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Please reconnect your wallet to update avatar');
        return;
      }

      // Save NFT avatar to backend
      const { usersAPI } = await import('@/lib/api');
      await usersAPI.updateProfile({ nftAvatar: nft.mint }, token);

      showSuccess('NFT avatar updated successfully!');
    } catch (error: unknown) {
      const errorMessage = (error as { data?: { error?: string }, message?: string })?.data?.error || (error as Error)?.message || 'Failed to update avatar';
      showError(errorMessage);
      logger.error('Error saving NFT avatar:', error);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
      </div>

      {/* Static gradient orbs for visual depth */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px]" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Main Content Container with sidebar layout */}
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />
          {/* Main Content */}
          <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">
            {/* Header */}
            <div className="sticky top-0 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)] z-10">
              <div className="flex items-center px-4 py-4">
                <button aria-label="Open mobile menu" className="md:hidden flex items-center justify-center w-12 h-12 text-[var(--color-text)] hover:bg-white/[0.04] transition-colors mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="p-2 hover:bg-white/[0.04] rounded-full transition-colors mr-3"
                >
                  <svg className="w-6 h-6 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-[var(--color-text)] flex-1">Profile</h1>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {/* Profile Header */}
              <div className="mb-8 relative">
                {/* Status Cards - Top Right */}
                <div className="absolute top-0 right-0 flex flex-col items-end gap-2">
                  {/* Premium Status Badge */}
                  {isPremium && (
                    <div className="rounded-xl px-4 py-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#000">
                            <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <div className="font-bold text-sm" style={{ color: '#000000' }}>Premium</div>
                          {daysUntilExpiration !== null && daysUntilExpiration >= 0 && (
                            <div className="text-xs" style={{ color: '#000000' }}>
                              {daysUntilExpiration === 0 ? 'Expires today' :
                               daysUntilExpiration === 1 ? 'Expires tomorrow' :
                               `${daysUntilExpiration} days left`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Balance Card */}
                  <div className="bg-gradient-to-r from-korus-primary to-korus-secondary rounded-xl px-4 py-2 shadow-lg shadow-korus-primary/20">
                    <div className="font-bold text-lg" style={{ color: '#000' }}>
                      {balance.toFixed(2)} SOL
                    </div>
                  </div>
                </div>

                {/* Avatar and Basic Info */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative mb-4">
                    <button
                      onClick={handleChangeAvatar}
                      aria-label="Change avatar"
                      className="relative group rounded-full"
                    >
                      <div className="w-32 h-32 bg-[var(--color-surface)] rounded-full flex items-center justify-center text-5xl font-bold text-[var(--color-text)] shadow-lg transition-all duration-150 border-2 border-[var(--color-border-light)]">
                        {selectedNFTAvatar ? (
                          <Image
                            src={selectedNFTAvatar.image || selectedNFTAvatar.uri}
                            alt="NFT Avatar"
                            width={112}
                            height={112}
                            className="rounded-full object-cover"
                          />
                        ) : selectedAvatar ? (
                          <span>{selectedAvatar}</span>
                        ) : (
                          <span>{walletAddress.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#262626] border border-[#3a3a3a] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                    </button>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h2 className={`text-2xl font-bold ${snsDomain ? 'text-korus-primary' : 'text-[var(--color-text)]'}`}>
                        {displayName}
                      </h2>
                      {isPremium && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                          <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                            <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-[var(--color-text-tertiary)] text-sm font-mono">{walletAddress}</span>
                      <button
                        onClick={handleCopyWallet}
                        aria-label={copied ? "Copied!" : "Copy wallet address"}
                        className="p-1 hover:bg-white/[0.04] rounded transition-colors"
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

                {/* Identity Options Section */}
                <div className="mb-6 bg-white/[0.04] backdrop-blur-sm border border-[var(--color-border-light)] rounded-2xl p-6 relative z-50">
                  <h3 className="text-lg font-bold text-[var(--color-text)] mb-4">Your Identity</h3>

                  {/* Display Name Dropdown */}
                  <div className="relative z-[100]" ref={snsDropdownRef}>
                    <button
                      onClick={() => setShowIdentityDropdown(!showIdentityDropdown)}
                      className="w-full p-4 bg-white/[0.06] border border-[var(--color-border-light)] rounded-xl hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[var(--color-text-secondary)] text-xs mb-1">Currently displaying as:</div>
                          <div className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                            {displayName}
                            {isPremium && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                                  <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-[var(--color-text-tertiary)] text-xs mt-1">
                            {dbSnsUsername === '__wallet__' ? 'Wallet Address' : dbSnsUsername ? 'SNS Domain' : currentUsername && displayName === currentUsername ? 'Custom Username' : 'Wallet Address'}
                          </div>
                        </div>
                        <svg className={`w-5 h-5 text-[var(--color-text-tertiary)] transition-transform ${showIdentityDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>

                    {showIdentityDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-light)] rounded-xl z-50 max-h-80 overflow-y-auto shadow-xl">
                        {/* Wallet Address option */}
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('authToken');
                              if (!token) return;
                              const { usersAPI } = await import('@/lib/api');
                              await usersAPI.updateProfile({ snsUsername: '__wallet__' }, token);
                              setDbSnsUsername('__wallet__');
                              setShowIdentityDropdown(false);
                              showSuccess('Now displaying as wallet address');
                            } catch {
                              showError('Failed to update display preference');
                            }
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/[0.06] transition-colors border-b border-[var(--color-border-light)]"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[var(--color-text)] font-medium flex items-center gap-2">
                                {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                                {isPremium && (
                                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                    <svg className="w-2 h-2" fill="black" viewBox="0 0 24 24">
                                      <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="text-[var(--color-text-tertiary)] text-xs">Wallet Address</div>
                            </div>
                            {(dbSnsUsername === '__wallet__' || (!dbSnsUsername && !currentUsername)) && (
                              <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                              </svg>
                            )}
                          </div>
                        </button>

                        {/* Custom Username option — select existing username as display */}
                        {currentUsername && (
                          <div className="border-b border-[var(--color-border-light)]">
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('authToken');
                                  if (!token) return;
                                  const { usersAPI } = await import('@/lib/api');
                                  await usersAPI.updateProfile({ snsUsername: '' }, token);
                                  setDbSnsUsername(null);
                                  setShowIdentityDropdown(false);
                                  showSuccess(`Now displaying as @${currentUsername}`);
                                } catch {
                                  showError('Failed to update display preference');
                                }
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-[var(--color-text)] font-medium flex items-center gap-2">
                                    @{currentUsername}
                                    {isPremium && (
                                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                        <svg className="w-2 h-2" fill="black" viewBox="0 0 24 24">
                                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-[var(--color-text-tertiary)] text-xs">Custom Username</div>
                                </div>
                                {!dbSnsUsername && currentUsername && displayName === currentUsername && (
                                  <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                  </svg>
                                )}
                              </div>
                            </button>
                            {/* Change Username — premium only */}
                            {isPremium && (
                              <button
                                onClick={() => {
                                  setShowIdentityDropdown(false);
                                  setEditingUsername(true);
                                  setTempUsernameValue(currentUsername || '');
                                  setUsernameError('');
                                }}
                                className="w-full px-4 py-2 pb-3 text-left hover:bg-white/[0.06] transition-colors"
                              >
                                <div className="text-korus-primary text-xs font-medium flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                  </svg>
                                  Change Username
                                </div>
                              </button>
                            )}
                          </div>
                        )}

                        {/* SNS Domain options — premium only */}
                        {allSNSDomains.map((domain, index) => (
                          <button
                            key={index}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isPremium) {
                                setShowIdentityDropdown(false);
                                setShowPremiumModal(true);
                                return;
                              }
                              try {
                                await setFavoriteSNSDomain(walletAddress, domain.domain);
                                const token = localStorage.getItem('authToken');
                                if (!token) {
                                  showError('Please reconnect your wallet');
                                  return;
                                }
                                const { usersAPI } = await import('@/lib/api');
                                await usersAPI.updateProfile({ snsUsername: domain.domain }, token);
                                setDbSnsUsername(domain.domain);
                                await setFavoriteSNSDomain(walletAddress, domain.domain);
                                setShowIdentityDropdown(false);
                                showSuccess(`Now displaying as ${domain.domain}`);
                                refreshSNS();
                                await refreshStatus();
                              } catch (error) {
                                const errorMessage = (error as { data?: { error?: string }, message?: string })?.data?.error || (error as Error)?.message || 'Failed to set SNS domain';
                                showError(errorMessage);
                                logger.error('Error setting SNS domain:', error);
                              }
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-white/[0.06] transition-colors border-b border-[var(--color-border-light)] last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[var(--color-text)] font-medium flex items-center gap-2">
                                  {domain.domain}
                                  {isPremium ? (
                                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                      <svg className="w-2 h-2" fill="black" viewBox="0 0 24 24">
                                        <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                      </svg>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold">PREMIUM</span>
                                  )}
                                </div>
                                <div className="text-[var(--color-text-tertiary)] text-xs">SNS Domain</div>
                              </div>
                              {domain.domain === dbSnsUsername && (
                                <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}

                        {/* Set Username option if not yet set */}
                        {!currentUsername && (
                          <button
                            onClick={() => {
                              setShowIdentityDropdown(false);
                              setShowUsernameWarning(true);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
                          >
                            <div className="text-korus-primary font-medium text-sm">+ Set Custom Username</div>
                            <div className="text-[var(--color-text-tertiary)] text-xs">Free users can set once</div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Username Editor — expands inline when editingUsername is true */}
                  {editingUsername && (
                    <div className="mt-4 p-4 bg-white/[0.04] border border-[var(--color-border-light)] rounded-xl">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={tempUsernameValue}
                          onChange={(e) => {
                            const cleanedText = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                            setTempUsernameValue(cleanedText);
                            if (cleanedText.length >= 3) {
                              setUsernameError(validateUsername(cleanedText));
                            } else {
                              setUsernameError('');
                            }
                          }}
                          placeholder="Enter username (3-20 chars, letters/numbers)"
                          className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                          autoCapitalize="none"
                          maxLength={20}
                          autoCorrect="false"
                          autoFocus
                        />
                        {usernameError && (
                          <p className="text-red-400 text-sm">{usernameError}</p>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setTempUsernameValue('');
                              setEditingUsername(false);
                              setUsernameError('');
                            }}
                            className="flex-1 px-4 py-2 bg-white/[0.08] border border-[var(--color-border-light)] text-[var(--color-text)] rounded-lg hover:bg-white/[0.12] duration-150"
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
                    </div>
                  )}

                </div>

                {/* Reputation Score Card */}
                <div className="bg-white/[0.04] backdrop-blur-sm border border-[var(--color-border-light)] rounded-2xl p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/20">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 3h12l4 6-10 12L2 9l4-6z"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-[var(--color-text)]">Reputation Score</h3>
                    </div>
                    <div className="text-4xl font-bold text-korus-primary mb-4">{isPremium ? reputation.reputationScore + Math.round((reputation.contentScore + reputation.engagementScore + reputation.communityScore + reputation.shoutoutScore + reputation.loyaltyScore + reputation.gamesScore) * 0.2) : reputation.reputationScore}</div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        label: 'Content',
                        score: reputation.contentScore,
                        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
                        tooltip: 'Posts created (+10 each), comments received (+3 each). Quality content drives your score.',
                        border: true,
                      },
                      {
                        label: 'Engagement',
                        score: reputation.engagementScore,
                        icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
                        tooltip: 'Likes given (+1), likes received (+2), comments made (+5), tips sent (+10 per 0.1 SOL), tips received (+15 per 0.1 SOL). Interact with others to grow.',
                        border: true,
                      },
                      {
                        label: 'Games',
                        score: reputation.gamesScore,
                        icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
                        tooltip: 'Game wins (+20), game losses (+5 participation), plus bonus points for higher wagers. Play games to earn!',
                        border: true,
                      },
                      {
                        label: 'Community',
                        score: reputation.communityScore,
                        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                        tooltip: 'Follows and community contributions. Build your network to grow.',
                        border: true,
                      },
                      {
                        label: 'Shoutouts',
                        score: reputation.shoutoutScore,
                        icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
                        tooltip: 'Purchase shoutouts to pin your message (+25 base, +10 per 0.1 SOL spent). Support the platform and get visibility.',
                        border: true,
                      },
                      {
                        label: 'Loyalty',
                        score: reputation.loyaltyScore,
                        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                        tooltip: 'Daily logins (+5 each). Consistent activity builds your loyalty score over time.',
                        border: false,
                      },
                    ].map((cat) => (
                      <div
                        key={cat.label}
                        className={`group relative flex items-center justify-between py-3 cursor-default ${cat.border ? 'border-b border-[var(--color-border-light)]/20' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon}/>
                          </svg>
                          <span className="text-[var(--color-text-secondary)] text-sm">{cat.label}</span>
                          <svg className="w-3.5 h-3.5 text-[#525252] group-hover:text-[var(--color-text-secondary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <span className="text-korus-primary font-bold">+{cat.score}</span>
                        {/* Tooltip */}
                        <div className="absolute left-0 bottom-full mb-2 w-72 bg-[var(--color-surface)] border border-[#333] rounded-lg px-3 py-2 text-xs text-[var(--color-text-secondary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                          {cat.tooltip}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isPremium && (() => {
                    const baseScore = reputation.contentScore + reputation.engagementScore + reputation.communityScore + reputation.shoutoutScore + reputation.loyaltyScore + reputation.gamesScore;
                    const premiumBonus = Math.round(baseScore * 0.2);
                    return (
                      <div className="group relative flex items-center justify-between py-3 mt-1 pt-4 border-t border-[var(--color-border-light)]/30 cursor-default">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                            </svg>
                          </div>
                          <span className="text-yellow-400 text-sm">Premium Bonus</span>
                          <svg className="w-3.5 h-3.5 text-[#525252] group-hover:text-[var(--color-text-secondary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <span className="text-yellow-400 font-bold">+{premiumBonus}</span>
                        <div className="absolute left-0 bottom-full mb-2 w-72 bg-[var(--color-surface)] border border-[#333] rounded-lg px-3 py-2 text-xs text-[var(--color-text-secondary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                          Premium members earn 20% bonus on all reputation points. This is your accumulated premium bonus.
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Posts & Replies */}
                <div className="bg-white/[0.04] backdrop-blur-sm border border-[var(--color-border-light)] rounded-2xl overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-[var(--color-border-light)]">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`flex-1 py-3 px-4 text-center transition-all duration-150 border-b-2 ${
                        activeTab === 'posts'
                          ? 'text-[var(--color-text)] font-semibold border-korus-primary'
                          : 'text-[var(--color-text-tertiary)] hover:bg-white/[0.04] hover:text-[var(--color-text-secondary)] border-transparent'
                      }`}
                    >
                      Posts
                    </button>
                    <button
                      onClick={() => setActiveTab('replies')}
                      className={`flex-1 py-3 px-4 text-center transition-all duration-150 border-b-2 ${
                        activeTab === 'replies'
                          ? 'text-[var(--color-text)] font-semibold border-korus-primary'
                          : 'text-[var(--color-text-tertiary)] hover:bg-white/[0.04] hover:text-[var(--color-text-secondary)] border-transparent'
                      }`}
                    >
                      Replies
                    </button>
                  </div>

                  {/* Tab Content — Posts */}
                  {activeTab === 'posts' && (
                    userPosts.length === 0 ? (
                      <div className="text-center py-16 px-6">
                        <div className="text-5xl mb-4 opacity-60">📝</div>
                        <p className="text-[var(--color-text)] text-lg font-medium mb-2">No posts yet</p>
                        <p className="text-[var(--color-text-secondary)] text-sm mb-6">
                          Share your thoughts, insights, or questions with the Korus community.<br/>
                          Your posts earn reputation and can receive tips!
                        </p>
                        <button
                          onClick={() => window.location.href = '/'}
                          className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150 hover:scale-105"
                        >
                          Create Your First Post
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#262626]/50">
                        {userPosts.map((post) => (
                          <a
                            key={post.id}
                            href={`/post/${post.id}`}
                            className="block p-6 hover:bg-white/[0.02] transition-all cursor-pointer"
                          >
                            <SafeContent
                              content={post.content}
                              as="p"
                              className="text-[var(--color-text)] mb-3"
                              allowLinks={true}
                              allowFormatting={true}
                            />
                            {post.imageUrl && (
                              <Image src={post.imageUrl} alt="Post image" width={600} height={400} className="w-full rounded-lg mb-3" />
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-5 text-[var(--color-text-tertiary)] text-sm">
                                <span>{post.likes} likes</span>
                                <span>{post.tips} tips</span>
                                <span>{post.replies || 0} replies</span>
                              </div>
                              <span className="text-[#525252] text-xs">
                                {new Date(post.createdAt || post.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' '}
                                {new Date(post.createdAt || post.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  )}

                  {/* Tab Content — Replies */}
                  {activeTab === 'replies' && (
                    userReplies.length === 0 ? (
                      <div className="text-center py-16 px-6">
                        <div className="text-5xl mb-4 opacity-60">💬</div>
                        <p className="text-[var(--color-text)] text-lg font-medium mb-2">No replies yet</p>
                        <p className="text-[var(--color-text-secondary)] text-sm mb-6">
                          Engage with other users&apos; posts to start building your reputation.<br/>
                          Thoughtful replies can earn tips and grow your network!
                        </p>
                        <button
                          onClick={() => window.location.href = '/'}
                          className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150 hover:scale-105"
                        >
                          Explore Posts to Reply
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#262626]/50">
                        {userReplies.map((reply) => (
                          <a
                            key={reply.id}
                            href={`/post/${reply.postId}`}
                            className="block p-6 hover:bg-white/[0.02] transition-all cursor-pointer"
                          >
                            {reply.postContent && (
                              <div className="text-[#525252] text-xs mb-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                                </svg>
                                Replying to {reply.postAuthor ? `@${reply.postAuthor}` : 'a post'}
                              </div>
                            )}
                            <SafeContent
                              content={reply.content}
                              as="p"
                              className="text-[var(--color-text)] mb-3"
                              allowLinks={true}
                              allowFormatting={true}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--color-text-tertiary)] text-sm">{reply.likeCount} likes</span>
                              <span className="text-[#525252] text-xs">
                                {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' '}
                                {new Date(reply.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Username Warning Modal */}
      {showUsernameWarning && (
        <div className="fixed inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--color-border-light)] rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.268 16.5C3.498 18.333 4.46 20 6 20z" />
                </svg>
              </div>
              <h3 className="text-[var(--color-text)] text-xl font-bold mb-2">Choose Wisely!</h3>
              <p className="text-[var(--color-text-secondary)] mb-6">
                As a free user, you can only set your username <strong>ONCE</strong>. Choose wisely!
                Premium users can change their username anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUsernameWarning(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.08] border border-[var(--color-border-light)] text-[var(--color-text)] rounded-lg hover:bg-white/[0.12] duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUsernameWarning(false);
                    setEditingUsername(true);
                    setUsernameError('');
                    setTempUsernameValue(currentUsername || '');
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSubscriptionUpdated={refreshStatus}
      />

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
          showSuccess('Post created successfully!');
          setShowCreatePostModal(false);
        }}
      />

      {/* NFT Avatar Selection Modal */}
      <NFTAvatarModal
        isOpen={showNFTAvatarModal}
        onClose={() => setShowNFTAvatarModal(false)}
        onSelectNFT={handleSelectNFT}
        currentAvatarNFT={selectedNFTAvatar?.mint}
      />
    </main>
  );
}