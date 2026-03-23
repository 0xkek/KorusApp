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

interface UserStats {
  posts: number;
  replies: number;
  likes: number;
  tips: number;
  repScore: number;
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
  const [showSNSDropdown, setShowSNSDropdown] = useState(false);
  const [hasSetUsername, setHasSetUsername] = useState(false);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);
  const [tempUsernameValue, setTempUsernameValue] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [userPosts] = useState<Post[]>([]); // Mock user posts (would come from API)
  const [selectedNFTAvatar, setSelectedNFTAvatar] = useState<NFT | null>(null); // NFT avatar
  const [showNFTAvatarModal, setShowNFTAvatarModal] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [dbSnsUsername, setDbSnsUsername] = useState<string | null>(null); // SNS from database
  const [reputationScore, setReputationScore] = useState<number>(0); // Backend reputation score

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

  // Calculate stats with memoization for performance
  const stats: UserStats = useMemo(() => {
    return {
      posts: userPosts.length,
      replies: userPosts.reduce((sum, post) => sum + post.replies, 0),
      likes: userPosts.reduce((sum, post) => sum + post.likes, 0),
      tips: userPosts.reduce((sum, post) => sum + post.tips, 0),
      repScore: reputationScore,
    };
  }, [userPosts, reputationScore]);

  const loadUserProfile = useCallback(async () => {
    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Load profile from API
      const { usersAPI, nftsAPI, reputationAPI } = await import('@/lib/api');
      const { user } = await usersAPI.getProfile(token);

      // Fetch reputation score from backend
      if (user.walletAddress) {
        try {
          const { reputation } = await reputationAPI.getReputation(user.walletAddress, token);
          setReputationScore(reputation.reputationScore);
        } catch {
          logger.error('Failed to load reputation, using 0');
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

  const displayName = useMemo(() => {
    // Priority: DB SNS username > regular username > wallet address
    return (isPremium && dbSnsUsername) || currentUsername || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  }, [isPremium, dbSnsUsername, currentUsername, walletAddress]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connection) {
        try {
          const lamports = await connection.getBalance(publicKey);
          setBalance(lamports / LAMPORTS_PER_SOL);
        } catch (error) {
          logger.error('Failed to fetch balance:', error);
        }
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

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

  // Handle SNS dropdown outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (snsDropdownRef.current && !snsDropdownRef.current.contains(event.target as Node)) {
        setShowSNSDropdown(false);
      }
    };

    if (showSNSDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSNSDropdown]);

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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-[#fafafa]">Redirecting...</div>
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
    <main className="min-h-screen bg-[#121212] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#121212] via-[#111111] to-[#121212]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#171717]/25 to-[#111111]/35" />
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
          {/* Main Content */}
          <div className="flex-1 min-w-0 border-x border-[#222222]">
            {/* Header */}
            <div className="sticky top-0 bg-[#171717]/80 backdrop-blur-xl border-b border-[#222222] z-10">
              <div className="flex items-center px-4 py-4">
                <button aria-label="Open mobile menu" className="md:hidden flex items-center justify-center w-12 h-12 text-[#fafafa] hover:bg-white/[0.04] transition-colors mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="p-2 hover:bg-white/[0.04] rounded-full transition-colors mr-3"
                >
                  <svg className="w-6 h-6 text-[#fafafa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-[#fafafa] flex-1">Profile</h1>
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
                    <div className="text-black font-bold text-lg">
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
                      <div className="w-32 h-32 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-5xl font-bold text-black shadow-lg shadow-korus-primary/20 group-hover:shadow-xl group-hover:shadow-korus-primary/30 transition-all duration-150 border-4 border-transparent">
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
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-korus-primary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/30 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                    </button>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h2 className={`text-2xl font-bold ${snsDomain ? 'text-korus-primary' : 'text-[#fafafa]'}`}>
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
                      <span className="text-[#737373] text-sm font-mono">{walletAddress}</span>
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
                <div className="mb-6 bg-white/[0.04] backdrop-blur-sm border border-[#2a2a2a] rounded-2xl p-6 relative z-50">
                  <h3 className="text-lg font-bold text-[#fafafa] mb-4">Your Identity</h3>

                  {/* Current Display Name */}
                  <div className="mb-6 p-4 bg-white/[0.06] border border-[#2a2a2a] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-5 h-5 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span className="text-[#a1a1a1] text-sm">Currently displaying as:</span>
                    </div>
                    <div className="text-xl font-bold text-[#fafafa]">{displayName}</div>
                    {isPremium && dbSnsUsername && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                          <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                            <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                          </svg>
                        </div>
                        <span className="text-yellow-400 text-sm font-medium">SNS Domain Active</span>
                      </div>
                    )}
                  </div>

                  {/* Identity Options Explanation */}
                  <div className="space-y-4 mb-6">
                    <div className="text-[#a1a1a1] text-sm">
                      Choose how others see you on the platform:
                    </div>

                    {/* Option 1: Wallet Address (Default) */}
                    <div className="flex items-start gap-3 p-3 bg-white/[0.04] rounded-lg">
                      <div className="w-6 h-6 mt-0.5 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-korus-primary">1</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#fafafa] mb-1">Wallet Address (Default)</div>
                        <div className="text-[#737373] text-sm mb-2">
                          {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`} • Always available
                        </div>
                        <div className="text-xs text-[#737373]">
                          Your truncated wallet address is shown by default when no other identity is set.
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Username */}
                    <div className="flex items-start gap-3 p-3 bg-white/[0.04] rounded-lg">
                      <div className="w-6 h-6 mt-0.5 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-korus-primary">2</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#fafafa] mb-1">Custom Username</div>
                        <div className="text-[#737373] text-sm mb-2">
                          {currentUsername ? `@${currentUsername}` : 'Not set'} •
                          <span className="text-korus-primary ml-1">
                            {!hasSetUsername ? 'Can set once (free)' : isPremium ? 'Can change anytime (premium)' : 'Locked (upgrade to change)'}
                          </span>
                        </div>
                        <div className="text-xs text-[#737373]">
                          Free users can set once. Premium users can change anytime.
                        </div>
                      </div>
                    </div>

                    {/* Option 3: SNS Domain */}
                    <div className="flex items-start gap-3 p-3 bg-white/[0.04] rounded-lg">
                      <div className="w-6 h-6 mt-0.5 bg-korus-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-korus-primary">3</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#fafafa]">SNS Domain</span>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                            <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                            </svg>
                          </div>
                          <span className="text-xs text-yellow-400 font-medium">PREMIUM ONLY</span>
                        </div>
                        <div className="text-[#737373] text-sm mb-2">
                          {allSNSDomains.length > 0
                            ? `${allSNSDomains.length} domain${allSNSDomains.length !== 1 ? 's' : ''} found in wallet`
                            : 'No domains found'
                          } • Highest priority display
                        </div>
                        <div className="text-xs text-[#737373]">
                          SNS domains override usernames when active. Premium feature only.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Username Editor */}
                  {!snsDomain && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-[#fafafa]">Set Username</h4>
                        {hasSetUsername && !isPremium && (
                          <svg className="w-4 h-4 text-[#737373]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                        )}
                      </div>

                      {!editingUsername ? (
                        <button
                          onClick={() => {
                            const canEdit = !hasSetUsername || isPremium;

                            if (!canEdit) {
                              showWarning('You have already set your username. Upgrade to Premium to change it anytime!');
                              return;
                            }

                            if (!currentUsername && !isPremium) {
                              setShowUsernameWarning(true);
                              return;
                            }

                            setEditingUsername(true);
                            setUsernameError('');
                            setTempUsernameValue(currentUsername || '');
                          }}
                          className="w-full bg-white/[0.06] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#222222] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            {currentUsername ? (
                              <span className="text-[#fafafa]">@{currentUsername}</span>
                            ) : (
                              <span className="text-[#737373]">Set your username</span>
                            )}
                            <svg className="w-4 h-4 text-[#737373] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </div>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={tempUsernameValue}
                            onChange={(e) => {
                              const cleanedText = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                              setTempUsernameValue(cleanedText);
                            }}
                            placeholder="Enter username (3-20 chars, letters/numbers)"
                            className="w-full bg-white/[0.06] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#fafafa] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
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
                                setTempUsernameValue('');
                                setEditingUsername(false);
                                setUsernameError('');
                              }}
                              className="flex-1 px-4 py-2 bg-white/[0.08] border border-[#2a2a2a] text-[#fafafa] rounded-lg hover:bg-white/[0.12] duration-150"
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

                  {/* SNS Domain Selector (Premium Only) */}
                  {isPremium && allSNSDomains.length > 0 && (
                    <div className="relative z-[100]">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-[#fafafa]">Select SNS Domain</h4>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                          <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                            <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                          </svg>
                        </div>
                      </div>

                      <div className="relative z-50" ref={snsDropdownRef}>
                        <button
                          onClick={() => setShowSNSDropdown(!showSNSDropdown)}
                          className="w-full bg-white/[0.06] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#222222] transition-colors"
                          disabled={allDomainsLoading}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-korus-primary rounded-full flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                                </svg>
                              </div>
                              <span className="text-[#fafafa]">
                                {snsLoading ? 'Loading...' : (snsDomain ? snsDomain : 'Select SNS Domain')}
                              </span>
                            </div>
                            <svg className={`w-4 h-4 text-[#737373] transition-transform ${showSNSDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg>
                          </div>
                        </button>

                        {/* SNS Dropdown */}
                        {showSNSDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#171717] backdrop-blur-xl border border-[#222222] rounded-xl z-50 max-h-60 overflow-y-auto">
                            {allSNSDomains.map((domain, index) => (
                              <button
                                key={index}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  logger.log(`Clicked on domain: ${domain.domain}`);

                                  try {
                                    // Set as favorite in local cache
                                    await setFavoriteSNSDomain(walletAddress, domain.domain);

                                    // Save to backend
                                    const token = localStorage.getItem('authToken');
                                    if (!token) {
                                      showError('Please reconnect your wallet');
                                      return;
                                    }

                                    const { usersAPI } = await import('@/lib/api');
                                    await usersAPI.updateProfile({ snsUsername: domain.domain }, token);

                                    // Update local state immediately
                                    setDbSnsUsername(domain.domain);

                                    // Update local cache with new domain
                                    await setFavoriteSNSDomain(walletAddress, domain.domain);

                                    setShowSNSDropdown(false);
                                    showSuccess(`SNS domain ${domain.domain} set successfully!`);

                                    // Refresh SNS domain display
                                    refreshSNS();

                                    // Refresh subscription status to update display
                                    await refreshStatus();
                                  } catch (error) {
                                    const errorMessage = (error as { data?: { error?: string }, message?: string })?.data?.error || (error as Error)?.message || 'Failed to set SNS domain';
                                    showError(errorMessage);
                                    logger.error('Error setting SNS domain:', error);
                                  }
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-korus-primary/20 hover:border-korus-primary/40 transition-colors border-b border-[#2a2a2a] last:border-b-0 cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${domain.favorite ? 'bg-korus-primary' : 'bg-[#737373]'}`} />
                                    <span className="text-[#fafafa]">{domain.domain}</span>
                                  </div>
                                  {domain.favorite && (
                                    <svg className="w-4 h-4 text-korus-primary" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                    </svg>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SNS Upgrade CTA (Non-Premium with domains) */}
                  {!isPremium && allSNSDomains.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-korus-primary/10 to-korus-secondary/10 border border-korus-primary/20 rounded-xl white-text">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-korus-primary rounded-full flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-[#fafafa]">
                          {allSNSDomains.length} SNS domain{allSNSDomains.length !== 1 ? 's' : ''} detected
                        </span>
                      </div>
                      <div className="space-y-1 mb-4">
                        {allSNSDomains.slice(0, 3).map((domain, index) => (
                          <div key={index} className="text-sm text-[#fafafa]">
                            • {domain.domain}
                          </div>
                        ))}
                        {allSNSDomains.length > 3 && (
                          <div className="text-[#737373] text-sm">
                            +{allSNSDomains.length - 3} more...
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowPremiumModal(true)}
                        className="w-full bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-4 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all"
                      >
                        Upgrade to Premium to Use SNS Domains
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="bg-[#171717] border border-[#222222] rounded-xl mb-6 relative z-10">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`flex-1 py-3 px-4 text-center transition-all duration-150 border-b-2 ${
                        activeTab === 'posts'
                          ? 'text-[#fafafa] font-semibold border-korus-primary'
                          : 'text-[#737373] hover:bg-white/[0.04] hover:text-[#a1a1a1] border-transparent'
                      }`}
                    >
                      Posts ({stats.posts})
                    </button>
                    <button
                      onClick={() => setActiveTab('replies')}
                      className={`flex-1 py-3 px-4 text-center transition-all duration-150 border-b-2 ${
                        activeTab === 'replies'
                          ? 'text-[#fafafa] font-semibold border-korus-primary'
                          : 'text-[#737373] hover:bg-white/[0.04] hover:text-[#a1a1a1] border-transparent'
                      }`}
                    >
                      Replies ({stats.replies})
                    </button>
                  </div>
                </div>

                {/* Reputation Score Card */}
                <div className="bg-white/[0.04] backdrop-blur-sm border border-[#2a2a2a] rounded-2xl p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center shadow-lg shadow-korus-primary/20">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 3h12l4 6-10 12L2 9l4-6z"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-[#fafafa]">Reputation Score</h3>
                    </div>
                    <div className="text-4xl font-bold text-korus-primary mb-4">{stats.repScore}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <span className="text-[#a1a1a1] text-sm">Posts created</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.posts * 10}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span className="text-[#a1a1a1] text-sm">Replies made</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.replies * 5}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                        <span className="text-[#a1a1a1] text-sm">Likes received</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.likes * 2}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                        </svg>
                        <span className="text-[#a1a1a1] text-sm">Tips received</span>
                      </div>
                      <span className="text-korus-primary font-bold">+{stats.tips * 20}</span>
                    </div>
                  </div>

                  {isPremium && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-[#2a2a2a]/30">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                        </svg>
                      </div>
                      <span className="text-yellow-400 text-sm font-medium">+20% Premium Bonus</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Posts Content */}
              <div className="space-y-4">
                {userPosts.length === 0 ? (
                  <div className="text-center py-20 bg-white/[0.04] backdrop-blur-sm border border-[#2a2a2a] rounded-2xl">
                    {activeTab === 'posts' ? (
                      <>
                        <div className="text-6xl mb-4 opacity-60">📝</div>
                        <p className="text-[#fafafa] text-lg font-medium mb-2">No posts yet</p>
                        <p className="text-[#a1a1a1] text-sm mb-6">
                          Share your thoughts, insights, or questions with the Korus community.<br/>
                          Your posts earn reputation and can receive tips!
                        </p>
                        <button
                          onClick={() => window.location.href = '/'}
                          className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150 hover:scale-105"
                        >
                          Create Your First Post
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-6xl mb-4 opacity-60">💬</div>
                        <p className="text-[#fafafa] text-lg font-medium mb-2">No replies yet</p>
                        <p className="text-[#a1a1a1] text-sm mb-6">
                          Engage with other users&apos; posts to start building your reputation.<br/>
                          Thoughtful replies can earn tips and grow your network!
                        </p>
                        <button
                          onClick={() => window.location.href = '/'}
                          className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150 hover:scale-105"
                        >
                          Explore Posts to Reply
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <div key={post.id} className="bg-white/[0.04] backdrop-blur-sm border border-[#2a2a2a] rounded-2xl p-6 hover:border-[#222222] transition-all group">
                      <SafeContent
                        content={post.content}
                        as="p"
                        className="text-[#fafafa] mb-4"
                        allowLinks={true}
                        allowFormatting={true}
                      />
                      {post.imageUrl && (
                        <Image src={post.imageUrl} alt="Post image" width={600} height={400} className="w-full rounded-lg mb-4" />
                      )}
                      <div className="flex items-center gap-6 text-[#737373] text-sm">
                        <span>{post.likes} likes</span>
                        <span>{post.tips} tips</span>
                        <span>{post.replies || 0} replies</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Username Warning Modal */}
      {showUsernameWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#171717] backdrop-blur-xl border border-[#222222] rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.268 16.5C3.498 18.333 4.46 20 6 20z" />
                </svg>
              </div>
              <h3 className="text-[#fafafa] text-xl font-bold mb-2">Choose Wisely!</h3>
              <p className="text-[#a1a1a1] mb-6">
                As a free user, you can only set your username <strong>ONCE</strong>. Choose wisely!
                Premium users can change their username anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUsernameWarning(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.08] border border-[#2a2a2a] text-[#fafafa] rounded-lg hover:bg-white/[0.12] duration-150"
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

      <LeftSidebar
        onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        onPostButtonClick={() => setShowCreatePostModal(true)}
        onSearchClick={() => setShowSearchModal(true)}
      />
      <RightSidebar
        showNotifications={showNotifications}
        onNotificationsClose={() => setShowNotifications(false)}
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