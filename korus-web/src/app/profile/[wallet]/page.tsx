'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import LinkPreview from '@/components/LinkPreview';
import VideoPlayer from '@/components/VideoPlayer';
import { FeedSkeleton } from '@/components/Skeleton';
import { SafeContent } from '@/components/SafeContent';
import { useToastContext } from '@/components/ToastProvider';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { postsAPI, usersAPI, interactionsAPI, nftsAPI, repliesAPI, followsAPI } from '@/lib/api';
import { formatRelativeTime } from '@/utils/formatTime';
import type { Post } from '@/types';
import type { UserProfile } from '@/lib/api/users';

const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const PostOptionsModal = dynamic(() => import('@/components/PostOptionsModal'), { ssr: false });

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const rawParam = params.wallet as string;
  const { connected, publicKey } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToastContext();

  // --- Profile state ---
  const [profileWallet, setProfileWallet] = useState(rawParam);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reputationScore, setReputationScore] = useState(0);
  const isOwnProfile = publicKey?.toBase58() === profileWallet;

  // --- Posts state ---
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postInteractions, setPostInteractions] = useState<{[key: string | number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}}>({});
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [userReplies, setUserReplies] = useState<Array<{
    id: string;
    content: string;
    createdAt: string;
    likeCount: number;
    postId: string;
    postContent?: string;
    postAuthor?: string;
  }>>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  // --- UI state ---
  const [showTipModal, setShowTipModal] = useState(false);
  const [postToTip, setPostToTip] = useState<Post | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [inlineReplyPostId, setInlineReplyPostId] = useState<string | number | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [isPostingInlineReply, setIsPostingInlineReply] = useState(false);
  const inlineReplyRef = useRef<HTMLTextAreaElement>(null);

  const POSTS_PER_PAGE = 20;

  // --- Helpers ---
  const truncateAddress = (address: string) => {
    if (!address || address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const extractUrls = (text: string): string[] => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const resolveAvatar = useCallback(async (nftAvatar: string | null | undefined): Promise<string | undefined> => {
    if (!nftAvatar) return undefined;
    if (nftAvatar.startsWith('http://') || nftAvatar.startsWith('https://')) return nftAvatar;
    try {
      const nft = await nftsAPI.getNFTByMint(nftAvatar);
      return nft?.image || undefined;
    } catch {
      return undefined;
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformPost = useCallback((post: any): Post => {
    return {
      ...post,
      user: post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15) || 'Unknown',
      wallet: post.authorWallet,
      userTheme: post.author?.themeColor,
      time: new Date(post.createdAt).toLocaleString(),
      createdAt: post.createdAt,
      likes: post.likeCount || 0,
      comments: post.replyCount || 0,
      reposts: post.repostCount || 0,
      tips: Number(post.tipAmount) || 0,
      image: post.imageUrl,
      avatar: post.author?.nftAvatar || null,
      isPremium: post.author?.tier === 'premium' || post.author?.tier === 'vip',
      repostedBy: post.isRepost ? (post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15)) : undefined,
      repostedPost: post.isRepost ? (
        post.originalPost ? {
          id: post.originalPost.id,
          user: post.originalPost.author?.username || post.originalPost.author?.snsUsername || post.originalPost.authorWallet?.slice(0, 15) || 'Unknown',
          wallet: post.originalPost.authorWallet,
          userTheme: post.originalPost.author?.themeColor,
          content: post.originalPost.content || '',
          likes: post.originalPost.likeCount || 0,
          replies: post.originalPost.replyCount || 0,
          tips: Number(post.originalPost.tipAmount) || 0,
          comments: post.originalPost.replyCount || 0,
          reposts: post.originalPost.repostCount || 0,
          time: new Date(post.originalPost.createdAt).toLocaleString(),
          createdAt: post.originalPost.createdAt,
          isPremium: post.originalPost.author?.tier === 'premium' || post.originalPost.author?.tier === 'vip',
          image: post.originalPost.imageUrl,
          avatar: post.originalPost.author?.nftAvatar || null,
        } : post.originalReply ? {
          id: post.originalReply.id,
          user: post.originalReply.author?.username || post.originalReply.author?.snsUsername || post.originalReply.authorWallet?.slice(0, 15) || 'Unknown',
          wallet: post.originalReply.authorWallet,
          userTheme: post.originalReply.author?.themeColor,
          content: post.originalReply.content || '',
          likes: post.originalReply.likeCount || 0,
          replies: 0,
          tips: Number(post.originalReply.tipCount) || 0,
          comments: 0,
          reposts: post.originalReply.repostCount || 0,
          time: new Date(post.originalReply.createdAt).toLocaleString(),
          createdAt: post.originalReply.createdAt,
          isPremium: post.originalReply.author?.tier === 'premium' || post.originalReply.author?.tier === 'vip',
          image: post.originalReply.imageUrl,
          avatar: post.originalReply.author?.nftAvatar || null,
        } : undefined
      ) : undefined,
    } as Post;
  }, []);

  const resolvePostAvatars = useCallback(async (posts: Post[]): Promise<Post[]> => {
    return Promise.all(posts.map(async (post) => {
      const avatar = await resolveAvatar(post.avatar);
      let repostedPost = post.repostedPost;
      if (repostedPost) {
        const rpAvatar = await resolveAvatar(repostedPost.avatar);
        repostedPost = { ...repostedPost, avatar: rpAvatar } as Post;
      }
      return { ...post, avatar, repostedPost } as Post;
    }));
  }, [resolveAvatar]);

  // --- Username resolution ---
  useEffect(() => {
    const isWallet = rawParam.length >= 32 && rawParam.length <= 44;
    if (!isWallet && rawParam.length <= 20) {
      usersAPI.getUserByUsername(rawParam).then((res) => {
        if (res.user?.walletAddress) {
          setProfileWallet(res.user.walletAddress);
        }
      }).catch(() => {});
    }
  }, [rawParam]);

  // --- Fetch profile data ---
  useEffect(() => {
    if (!profileWallet) return;

    usersAPI.getUserByWallet(profileWallet).then(async (res) => {
      setProfileUser(res.user);
      setFollowerCount(res.user.followerCount || 0);
      setFollowingCount(res.user.followingCount || 0);
      setReputationScore(res.user.reputationScore || 0);
      // Resolve avatar
      const avatar = await resolveAvatar(res.user.nftAvatar);
      setResolvedAvatar(avatar || null);
    }).catch(() => {
      // User may not exist in DB yet (wallet connected but never interacted)
    });
  }, [profileWallet, resolveAvatar]);

  // --- Check follow status ---
  useEffect(() => {
    if (isAuthenticated && token && profileWallet && !isOwnProfile) {
      followsAPI.checkFollowing([profileWallet], token).then(res => {
        setIsFollowing(res.following[profileWallet] || false);
      }).catch(() => {});
    }
  }, [isAuthenticated, token, profileWallet, isOwnProfile]);

  // --- Fetch user posts ---
  const fetchUserPosts = useCallback(async () => {
    if (!profileWallet) return;
    setIsLoadingPosts(true);
    try {
      const response = await postsAPI.getUserPosts(profileWallet, { limit: POSTS_PER_PAGE });
      if (response.posts && response.posts.length > 0) {
        const transformed = response.posts.map(transformPost);
        const withAvatars = await resolvePostAvatars(transformed);
        setUserPosts(withAvatars);
        setHasMore(response.meta?.hasMore || response.pagination?.hasMore || false);
        setNextCursor(response.meta?.nextCursor || response.pagination?.cursor || null);
      } else {
        setUserPosts([]);
        setHasMore(false);
      }
    } catch {
      setUserPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [profileWallet, transformPost, resolvePostAvatars]);

  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  // --- Fetch user replies ---
  const fetchUserReplies = useCallback(async () => {
    if (!profileWallet) return;
    setIsLoadingReplies(true);
    try {
      const response = await repliesAPI.getUserReplies(profileWallet, { limit: 50 });
      if (response.replies && response.replies.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformed = response.replies.map((reply: any) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          likeCount: reply.likeCount || 0,
          postId: reply.postId,
          postContent: reply.post?.content?.slice(0, 100) || '',
          postAuthor: reply.post?.author?.username || reply.post?.author?.snsUsername || reply.post?.authorWallet?.slice(0, 10) || '',
        }));
        setUserReplies(transformed);
      } else {
        setUserReplies([]);
      }
    } catch {
      setUserReplies([]);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [profileWallet]);

  useEffect(() => {
    fetchUserReplies();
  }, [fetchUserReplies]);

  // --- Load more posts ---
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor || !profileWallet) return;
    setIsLoadingMore(true);
    try {
      const response = await postsAPI.getUserPosts(profileWallet, { limit: POSTS_PER_PAGE, cursor: nextCursor });
      if (response.posts && response.posts.length > 0) {
        const transformed = response.posts.map(transformPost);
        const withAvatars = await resolvePostAvatars(transformed);
        setUserPosts(prev => [...prev, ...withAvatars]);
        setHasMore(response.meta?.hasMore || response.pagination?.hasMore || false);
        setNextCursor(response.meta?.nextCursor || response.pagination?.cursor || null);
      } else {
        setHasMore(false);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextCursor, profileWallet, transformPost, resolvePostAvatars]);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMorePosts,
    hasMore,
    isLoading: isLoadingMore,
  });

  // --- Fetch user interactions ---
  useEffect(() => {
    if (!connected || !isAuthenticated || !token || userPosts.length === 0) return;
    const postIds = userPosts.map(post => String(post.id));
    interactionsAPI.getUserInteractions(postIds, token).then(response => {
      if (response.success) {
        setPostInteractions(response.interactions as {[key: number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}});
      }
    }).catch(() => {});
  }, [userPosts, connected, isAuthenticated, token]);

  // --- Interaction handlers ---
  const toggleLike = async (postId: number | string) => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet to like posts');
      return;
    }
    const id = String(postId);
    const currentlyLiked = postInteractions[id]?.liked || false;

    setPostInteractions(prev => ({ ...prev, [id]: { ...prev[id], liked: !currentlyLiked } }));
    setUserPosts(prev => prev.map(p => {
      if (String(p.id) === id) return { ...p, likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 };
      if (p.repostedPost && String(p.repostedPost.id) === id) {
        return { ...p, repostedPost: { ...p.repostedPost, likes: currentlyLiked ? Math.max(0, (p.repostedPost.likes ?? 0) - 1) : (p.repostedPost.likes ?? 0) + 1 } };
      }
      return p;
    }));

    try {
      await interactionsAPI.likePost(id, token);
    } catch {
      // Revert
      setPostInteractions(prev => ({ ...prev, [id]: { ...prev[id], liked: currentlyLiked } }));
      setUserPosts(prev => prev.map(p => {
        if (String(p.id) === id) return { ...p, likes: currentlyLiked ? p.likes + 1 : Math.max(0, p.likes - 1) };
        if (p.repostedPost && String(p.repostedPost.id) === id) {
          return { ...p, repostedPost: { ...p.repostedPost, likes: currentlyLiked ? (p.repostedPost.likes ?? 0) + 1 : Math.max(0, (p.repostedPost.likes ?? 0) - 1) } };
        }
        return p;
      }));
      showError('Failed to like post');
    }
  };

  const toggleRepost = async (postId: number | string) => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet to repost');
      return;
    }
    const originalPost = userPosts.find(p => String(p.id) === String(postId));
    if (!originalPost) return;
    if (publicKey && (originalPost.wallet === publicKey.toBase58())) {
      showError("You can't repost your own post");
      return;
    }
    const isReposted = postInteractions[postId]?.reposted || false;
    try {
      const response = await interactionsAPI.repostPost(String(postId), token);
      if (response.success) {
        setPostInteractions(prev => ({ ...prev, [postId]: { ...prev[postId], reposted: !isReposted } }));
        setUserPosts(prev => prev.map(p => {
          if (String(p.id) === String(postId)) return { ...p, reposts: !isReposted ? (p.reposts ?? 0) + 1 : Math.max(0, (p.reposts ?? 0) - 1) };
          return p;
        }));
        showSuccess(isReposted ? 'Repost removed' : 'Reposted!');
      }
    } catch {
      showError('Failed to repost');
    }
  };

  const submitInlineReply = async (post: Post) => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet to reply');
      return;
    }
    if (!inlineReplyText.trim()) return;
    setIsPostingInlineReply(true);
    try {
      const response = await repliesAPI.createReply(String(post.id), { content: inlineReplyText.trim() }, token);
      if (response.reply) {
        setUserPosts(prev => prev.map(p => {
          if (p.id === post.id) return { ...p, replies: p.replies + 1, comments: (p.comments || 0) + 1 } as Post;
          return p;
        }));
        setPostInteractions(prev => ({ ...prev, [post.id]: { ...prev[post.id], replied: true } }));
        showSuccess('Reply posted!');
      }
      setInlineReplyText('');
      setInlineReplyPostId(null);
    } catch {
      showError('Failed to post reply');
    } finally {
      setIsPostingInlineReply(false);
    }
  };

  // --- Profile actions ---
  const handleToggleFollow = async () => {
    if (!isAuthenticated || !token) return;
    setIsFollowLoading(true);
    try {
      const res = await followsAPI.toggleFollow(profileWallet, token);
      setIsFollowing(res.following);
      setFollowerCount(prev => res.following ? prev + 1 : Math.max(0, prev - 1));
    } catch {
      // silently fail
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(profileWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Derived values ---
  const displayName = profileUser?.username || profileUser?.snsUsername || profileUser?.displayName || `${profileWallet.slice(0, 4)}...${profileWallet.slice(-4)}`;
  const isPremium = profileUser?.tier === 'premium' || profileUser?.tier === 'vip';

  // --- Get current user's avatar for inline reply ---
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (isAuthenticated && token) {
      usersAPI.getProfile(token).then(async (res) => {
        const avatar = await resolveAvatar(res.user.nftAvatar);
        setCurrentUserAvatar(avatar || null);
      }).catch(() => {});
    }
  }, [isAuthenticated, token, resolveAvatar]);

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
      </div>
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />
          <div className="flex-1 min-w-0 border-x border-[var(--color-border-light)]">

            {/* Sticky Top Bar */}
            <div className="sticky top-0 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)] z-10">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-white/[0.04] rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-bold text-[var(--color-text)] leading-tight">{displayName}</h1>
                  <p className="text-[12px] text-[var(--color-text-tertiary)]">{userPosts.length} posts</p>
                </div>
              </div>
            </div>

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
                      onClick={handleToggleFollow}
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
                      onClick={() => { setPostToTip(null); setShowTipModal(true); }}
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
                  onClick={handleCopyWallet}
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
                onClick={() => setActiveTab('posts')}
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
                onClick={() => setActiveTab('replies')}
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

            {/* Posts Feed */}
            {activeTab === 'posts' && (
              <>
                {isLoadingPosts ? (
                  <FeedSkeleton />
                ) : userPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-[var(--color-text-tertiary)] text-[15px]">No posts yet</p>
                  </div>
                ) : (
                  userPosts.filter(p => !p.isShoutout).map((post) => (
                    <div
                      key={post.id}
                      className="px-5 py-4 border-b border-[var(--color-border-light)] hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      onClick={() => router.push(`/post/${post.repostedPost?.id || post.id}`)}
                    >
                      {/* Repost Header */}
                      {post.repostedBy && (
                        <div className="flex items-center gap-2 ml-[52px] mb-1.5 text-[13px] text-[var(--color-text-tertiary)]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>
                            <Link href={`/profile/${post.wallet}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline">
                              {truncateAddress(post.repostedBy)}
                            </Link>
                            {' '}reposted
                          </span>
                        </div>
                      )}

                      {/* Avatar + Header */}
                      <div className="flex items-center gap-3">
                        {(() => {
                          const displayAvatar = post.repostedPost?.avatar || post.avatar;
                          const displayUser = post.repostedPost?.user || post.user;
                          return displayAvatar ? (
                            <div className="w-[42px] h-[42px] rounded-full flex-shrink-0 overflow-hidden">
                              <Image src={displayAvatar} alt={`${displayUser} avatar`} width={42} height={42} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-[14px] font-bold text-black flex-shrink-0">
                              {displayUser.slice(0, 2).toUpperCase()}
                            </div>
                          );
                        })()}

                        {(() => {
                          const displayPost = post.repostedPost || post;
                          const displayWallet = displayPost.wallet || displayPost.user;
                          const displayUser = displayPost.user;
                          const displayPremium = displayPost.isPremium;
                          const displayTime = displayPost.createdAt || displayPost.time;
                          return (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <Link href={`/profile/${displayWallet}`} onClick={(e) => e.stopPropagation()} className="font-bold text-[15px] hover:underline cursor-pointer text-[var(--color-text)]">
                                {truncateAddress(displayUser)}
                              </Link>
                              {displayPremium && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                                  <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24"><path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/></svg>
                                </div>
                              )}
                              <span className="text-[14px] text-[var(--color-text-secondary)]">@{truncateAddress(displayUser)}</span>
                              <span className="text-[#525252] text-[12px]">&middot;</span>
                              <span className="text-[13px] text-[#525252]">{formatRelativeTime(displayTime as string)}</span>
                              <div className="ml-auto">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedPost(post); setShowPostOptionsModal(true); }}
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[#b0b0b0] hover:bg-white/[0.06] transition-colors duration-150 opacity-0 group-hover:opacity-100"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Post Body */}
                      <div className="ml-[52px] mt-0.5">
                        {(post.repostedPost?.content || post.content) && (
                          <SafeContent
                            content={post.repostedPost?.content || post.content}
                            className="text-[15px] leading-[1.55] text-[#e5e5e5] whitespace-pre-wrap break-words"
                            allowLinks={true}
                            allowFormatting={true}
                          />
                        )}

                        {extractUrls(post.repostedPost?.content || post.content).map((url, index) => (
                          <div key={index} className="mb-3"><LinkPreview url={url} /></div>
                        ))}

                        {post.video && (
                          <div className="mb-3"><VideoPlayer videoUrl={post.video} /></div>
                        )}

                        {(post.repostedPost?.image || post.image) && (
                          <div className="mb-3 flex justify-center">
                            <Image
                              src={(post.repostedPost?.image || post.image) as string}
                              alt="Post content"
                              width={600}
                              height={400}
                              className="max-w-full h-auto rounded-xl border border-[var(--color-border-light)]"
                              style={{ maxHeight: '500px', width: 'auto', height: 'auto' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        )}

                        {/* Action Bar */}
                        {(() => {
                          const actionPostId = post.repostedPost?.id || post.id;
                          const actionPost = post.repostedPost || post;
                          return (
                            <div className="flex items-center gap-0.5 mt-3 -ml-2">
                              {/* Comment */}
                              <button
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                                  postInteractions[actionPostId]?.replied
                                    ? 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (inlineReplyPostId === actionPostId) { setInlineReplyPostId(null); setInlineReplyText(''); }
                                  else { setInlineReplyPostId(actionPostId); setInlineReplyText(''); setTimeout(() => inlineReplyRef.current?.focus(), 50); }
                                }}
                              >
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <span>{actionPost.comments ?? actionPost.replies ?? 0}</span>
                              </button>

                              {/* Like */}
                              <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 hover:bg-red-500/10"
                                style={{ color: postInteractions[actionPostId]?.liked ? '#ef4444' : '#737373' }}
                                onClick={(e) => { e.stopPropagation(); toggleLike(actionPostId); }}
                              >
                                <svg className="w-[18px] h-[18px]" fill={postInteractions[actionPostId]?.liked ? '#ef4444' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                <span>{actionPost.likes ?? 0}</span>
                              </button>

                              {/* Repost */}
                              <button
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                                  postInteractions[actionPostId]?.reposted
                                    ? 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                                }`}
                                onClick={(e) => { e.stopPropagation(); toggleRepost(actionPostId); }}
                              >
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                <span>{actionPost.reposts ?? 0}</span>
                              </button>

                              {/* Tip */}
                              <button
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                                  postInteractions[actionPostId]?.tipped
                                    ? 'text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)]'
                                    : 'text-[var(--color-text-tertiary)] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)]'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const tipTarget = post.repostedPost || post;
                                  if (publicKey && (tipTarget.wallet === publicKey.toBase58() || tipTarget.author?.walletAddress === publicKey.toBase58())) {
                                    showError("You cannot tip your own posts");
                                    return;
                                  }
                                  setPostToTip(tipTarget);
                                  setShowTipModal(true);
                                }}
                              >
                                <svg className={`w-[18px] h-[18px] ${postInteractions[actionPostId]?.tipped ? 'text-[#f59e0b]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {actionPost.tips ? <span className={`text-[11px] font-semibold px-1.5 rounded-[6px] ${postInteractions[actionPostId]?.tipped ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]' : 'bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] text-[var(--korus-primary)]'}`}>{actionPost.tips} SOL</span> : <span>Tip</span>}
                              </button>

                              {/* Share */}
                              <button
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.08] transition-all duration-150"
                                onClick={(e) => { e.stopPropagation(); setPostToShare(post.repostedPost || post); setShowShareModal(true); }}
                              >
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                              </button>
                            </div>
                          );
                        })()}

                        {/* Inline Reply */}
                        {inlineReplyPostId === (post.repostedPost?.id || post.id) && (
                          <div className="mt-3 flex gap-3" onClick={(e) => e.stopPropagation()}>
                            {currentUserAvatar ? (
                              <div className="w-[32px] h-[32px] rounded-full flex-shrink-0 overflow-hidden">
                                <Image src={currentUserAvatar} alt="You" width={32} height={32} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
                                <span className="text-black font-bold text-[10px]">{publicKey?.toBase58().slice(0, 2).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 flex gap-2">
                              <textarea
                                ref={inlineReplyRef}
                                value={inlineReplyText}
                                onChange={(e) => setInlineReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInlineReply(post.repostedPost || post); }
                                  if (e.key === 'Escape') { setInlineReplyPostId(null); setInlineReplyText(''); }
                                }}
                                placeholder="Post your reply..."
                                className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[16px] px-3 py-2 text-[14px] text-[var(--color-text)] placeholder-[#525252] resize-none outline-none focus:border-[var(--korus-primary)]/50 transition-colors min-h-[36px] max-h-[120px]"
                                rows={1}
                              />
                              <button
                                onClick={() => submitInlineReply(post.repostedPost || post)}
                                disabled={!inlineReplyText.trim() || isPostingInlineReply}
                                className="self-end px-4 py-1.5 rounded-[16px] bg-[var(--korus-primary)] text-[13px] font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: '#000' }}
                              >
                                {isPostingInlineReply ? '...' : 'Reply'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Infinite Scroll Sentinel */}
                {!isLoadingPosts && userPosts.length > 0 && (
                  <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Replies Tab */}
            {activeTab === 'replies' && (
              isLoadingReplies ? (
                <div className="text-center py-16">
                  <div className="w-6 h-6 border-2 border-[var(--korus-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : userReplies.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[var(--color-text-tertiary)] text-[15px]">No replies yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#262626]/50">
                  {userReplies.map((reply) => (
                    <Link
                      key={reply.id}
                      href={`/post/${reply.postId}`}
                      className="block p-4 hover:bg-white/[0.02] transition-all"
                    >
                      {reply.postContent && (
                        <div className="text-[var(--color-text-tertiary)] text-[12px] mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                          </svg>
                          Replying to {reply.postAuthor ? `@${reply.postAuthor}` : 'a post'}
                        </div>
                      )}
                      <SafeContent
                        content={reply.content}
                        as="p"
                        className="text-[var(--color-text)] text-[15px] mb-2"
                        allowLinks={true}
                        allowFormatting={true}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-text-tertiary)] text-[13px]">{reply.likeCount} likes</span>
                        <span className="text-[var(--color-text-tertiary)] text-[12px]">
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}

          </div>
          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Modals */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => { setShowTipModal(false); setPostToTip(null); }}
        recipientUser={postToTip?.wallet || postToTip?.author?.walletAddress || profileWallet}
      />
      {postToShare && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => { setShowShareModal(false); setPostToShare(null); }}
          postId={postToShare.id}
          postContent={postToShare.content || ''}
          postUser={postToShare.user || ''}
        />
      )}
      {showPostOptionsModal && selectedPost && (
        <PostOptionsModal
          isOpen={showPostOptionsModal}
          onClose={() => setShowPostOptionsModal(false)}
          postId={selectedPost.id}
          postUser={selectedPost.user || ''}
          isOwnPost={publicKey?.toBase58() === selectedPost.wallet}
          onDelete={() => {
            setUserPosts(prev => prev.filter(p => p.id !== selectedPost.id));
            setShowPostOptionsModal(false);
          }}
        />
      )}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={userPosts}
      />
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={() => { setShowCreatePostModal(false); fetchUserPosts(); }}
      />

    </main>
  );
}
