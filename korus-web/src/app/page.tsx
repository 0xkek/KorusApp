'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import LinkPreview from '@/components/LinkPreview';
import VideoPlayer from '@/components/VideoPlayer';
import { FeedSkeleton } from '@/components/Skeleton';
import { SafeContent } from '@/components/SafeContent';
import { useToastContext } from '@/components/ToastProvider';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Post } from '@/types';
import { postsAPI, uploadAPI, interactionsAPI, usersAPI, nftsAPI, repliesAPI, notificationsAPI } from '@/lib/api';
import { formatRelativeTime } from '@/utils/formatTime';

// Dynamically import modals for code splitting
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const PostOptionsModal = dynamic(() => import('@/components/PostOptionsModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });
const ShoutoutModal = dynamic(() => import('@/components/ShoutoutModal'), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const EmojiPicker = dynamic(() => import('@/components/EmojiPicker'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const ReplyModal = dynamic(() => import('@/components/ReplyModal'), { ssr: false });
const DrawingCanvasInline = dynamic(() => import('@/components/DrawingCanvasInline'), { ssr: false });
const ShoutoutCountdown = dynamic(() => import('@/components/ShoutoutCountdown'), { ssr: false });
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const GifPicker = dynamic(() => import('@/components/GifPicker'), { ssr: false });

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const { token, isAuthenticated } = useWalletAuth();

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (!address || address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]); // Initialize empty
  const [composeText, setComposeText] = useState('');
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [postToTip, setPostToTip] = useState<Post | null>(null);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [postToReply, setPostToReply] = useState<Post | null>(null);
  const [postInteractions, setPostInteractions] = useState<{[key: string | number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const drawingSaveRef = useRef<(() => string | null) | null>(null);
  const [shoutoutQueue, setShoutoutQueue] = useState<Post[]>([]); // Queue for pending shoutouts
  const activeShoutoutIdRef = useRef<string | number | null>(null); // Track which shoutout is currently active
  const [shoutoutQueueInfo, setShoutoutQueueInfo] = useState<{ activeShoutout: { id: string; duration: number; expiresAt: Date | string; content: string } | null; queuedShoutouts: Array<{ id: string; duration: number; expiresAt: Date | string; content: string }>}>({ activeShoutout: null, queuedShoutouts: [] });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [inlineReplyPostId, setInlineReplyPostId] = useState<string | number | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [isPostingInlineReply, setIsPostingInlineReply] = useState(false);
  const [hideShoutouts, setHideShoutouts] = useState(false);

  // Compute effective queue info from actual feed state
  const effectiveQueueInfo = useMemo(() => {
    const activeShoutout = posts.find(p => p.isShoutout);
    const queuedFromPosts = posts.filter(p => p.isShoutout).slice(1);
    // Merge local queue + backend queue, deduplicating by id
    const seenIds = new Set<string>();
    const allQueued: Array<{ id: string; duration: number; expiresAt: string | Date; content: string }> = [];
    for (const p of [...queuedFromPosts, ...shoutoutQueue]) {
      const sid = String(p.id);
      if (!seenIds.has(sid)) {
        seenIds.add(sid);
        allQueued.push({ id: sid, duration: p.shoutoutDuration || 10, expiresAt: p.shoutoutExpiresAt || new Date(), content: p.content || '' });
      }
    }
    for (const q of shoutoutQueueInfo.queuedShoutouts) {
      const sid = String(q.id);
      if (!seenIds.has(sid)) {
        seenIds.add(sid);
        allQueued.push({ id: sid, duration: q.duration || 10, expiresAt: q.expiresAt || new Date(), content: q.content || '' });
      }
    }
    return {
      activeShoutout: activeShoutout ? {
        id: String(activeShoutout.id),
        duration: activeShoutout.shoutoutDuration || 10,
        expiresAt: activeShoutout.shoutoutExpiresAt || new Date(),
        content: activeShoutout.content || '',
      } : null,
      queuedShoutouts: allQueued,
    };
  }, [posts, shoutoutQueue, shoutoutQueueInfo]);

  // Load hide shoutout preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setHideShoutouts(localStorage.getItem('korus-hide-shoutout') === 'true');
      } catch { /* ignore */ }
    }
  }, []);
  const inlineReplyRef = useRef<HTMLTextAreaElement>(null);
  const [, setCurrentUserTheme] = useState<string | undefined>(undefined);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Resolve nftAvatar: could be a URL or a mint address
  const resolveAvatar = useCallback(async (nftAvatar: string | null | undefined): Promise<string | undefined> => {
    if (!nftAvatar) return undefined;
    const isUrl = nftAvatar.startsWith('http://') || nftAvatar.startsWith('https://');
    if (isUrl) return nftAvatar;
    try {
      const nft = await nftsAPI.getNFTByMint(nftAvatar);
      return nft?.image || undefined;
    } catch {
      return undefined;
    }
  }, []);

  // Resolve avatars for an array of transformed posts
  const resolvePostAvatars = useCallback(async (transformedPosts: Post[]): Promise<Post[]> => {
    const updated = await Promise.all(
      transformedPosts.map(async (post) => {
        const avatar = await resolveAvatar(post.avatar);
        return { ...post, avatar } as Post;
      })
    );
    return updated;
  }, [resolveAvatar]);

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 20;

  // WebSocket connection ref
  const socketRef = useRef<Socket | null>(null);
  const addedPostIds = useRef<Set<string | number>>(new Set());

  // Load more posts for infinite scroll (defined early to avoid hoisting issues)
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;

      const response = await postsAPI.getPosts({
        page: nextPage,
        limit: POSTS_PER_PAGE,
      });

      if (response.posts && response.posts.length > 0) {
        // Transform new posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPosts = response.posts.map((post: any) => {
          return {
          ...post,
          user: post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15) || 'Unknown',
          wallet: post.authorWallet,
          userTheme: post.author?.themeColor,
          time: new Date(post.createdAt).toLocaleString(),
          createdAt: post.createdAt, // Keep raw timestamp for sorting
          likes: post.likeCount || 0,
          comments: post.replyCount || 0,
          reposts: post.repostCount || 0,
          tips: Number(post.tipAmount) || 0,
          image: post.imageUrl,
          avatar: post.author?.nftAvatar || null,
          isPremium: post.author?.tier === 'premium' || post.author?.tier === 'vip',
          shoutoutExpiresAt: post.shoutoutExpiresAt,
          repostedBy: post.isRepost ? (post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15)) : undefined,
          repostedPost: post.isRepost ? (
            post.originalPost ? {
              // Post repost
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
              // Reply repost
              id: post.originalReply.id,
              user: post.originalReply.author?.username || post.originalReply.author?.snsUsername || post.originalReply.authorWallet?.slice(0, 15) || 'Unknown',
              wallet: post.originalReply.authorWallet,
              userTheme: post.originalReply.author?.themeColor,
              content: post.originalReply.content || '',
              likes: post.originalReply.likeCount || 0,
              replies: 0, // Replies don't track reply count
              tips: Number(post.originalReply.tipCount) || 0,
              comments: 0, // Replies don't track reply count
              reposts: post.originalReply.repostCount || 0,
              time: new Date(post.originalReply.createdAt).toLocaleString(),
              createdAt: post.originalReply.createdAt,
              isPremium: post.originalReply.author?.tier === 'premium' || post.originalReply.author?.tier === 'vip',
              image: post.originalReply.imageUrl,
              avatar: post.originalReply.author?.nftAvatar || null,
            } : undefined
          ) : undefined,
        };
        });

        // Resolve avatars (mint address → image URL)
        const postsWithAvatars = await resolvePostAvatars(transformedPosts as Post[]);

        // Track new post IDs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postsWithAvatars.forEach((post: any) => addedPostIds.current.add(post.id));

        // Append new posts to existing ones
        setPosts(prev => [...prev, ...postsWithAvatars]);
        setCurrentPage(nextPage);
        setHasMore(response.posts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      logger.error('Failed to load more posts:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage, POSTS_PER_PAGE]);

  // Infinite scroll sentinel ref
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMorePosts,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 300,
  });

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  // Fetch current user's profile to get theme color
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token && connected) {
        try {
          const response = await usersAPI.getProfile(token);
          if (response.user && response.user.themeColor) {
            setCurrentUserTheme(response.user.themeColor);
          }

          // Load NFT avatar if user has one
          if (response.user && response.user.nftAvatar) {
            try {
              // Check if nftAvatar is a URL (old data) or a mint address (new data)
              const isUrl = response.user.nftAvatar.startsWith('http://') || response.user.nftAvatar.startsWith('https://');

              if (isUrl) {
                // Old data: nftAvatar is already an image URL
                setUserAvatar(response.user.nftAvatar);
              } else {
                // New data: nftAvatar is a mint address, need to resolve to image
                const nft = await nftsAPI.getNFTByMint(response.user.nftAvatar);
                if (nft?.image) {
                  setUserAvatar(nft.image);
                }
              }
            } catch (error) {
              logger.error('Error loading NFT avatar:', error);
            }
          }
        } catch (error) {
          logger.error('Failed to fetch user profile:', error);
        }
      }
    };
    fetchUserProfile();
  }, [token, connected]);

  // Fetch posts function (initial load)
  const fetchPosts = async () => {
    try {
      setIsLoading(true);

      // Try to fetch from backend API with pagination
      const response = await postsAPI.getPosts({
        page: 1,
        limit: POSTS_PER_PAGE,
      });

      // If we got posts from the backend, use them
      if (response.posts && response.posts.length > 0) {
        // Transform backend posts to match frontend format
        // Note: Backend posts have a different structure than frontend Post type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPosts = response.posts.map((post: any) => ({
          ...post,
          user: post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15) || 'Unknown',
          wallet: post.authorWallet,
          userTheme: post.author?.themeColor,
          time: new Date(post.createdAt).toLocaleString(),
          createdAt: post.createdAt, // Keep raw timestamp for sorting
          likes: post.likeCount || 0,
          comments: post.replyCount || 0,
          reposts: post.repostCount || 0,
          tips: Number(post.tipAmount) || 0,
          image: post.imageUrl,
          avatar: post.author?.nftAvatar || null,
          isPremium: post.author?.tier === 'premium' || post.author?.tier === 'vip',
          shoutoutExpiresAt: post.shoutoutExpiresAt,
          // Map originalPost to repostedPost for reposts
          repostedBy: post.isRepost ? (post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15)) : undefined,
          repostedPost: post.isRepost ? (
            post.originalPost ? {
              // Post repost
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
              // Reply repost
              id: post.originalReply.id,
              user: post.originalReply.author?.username || post.originalReply.author?.snsUsername || post.originalReply.authorWallet?.slice(0, 15) || 'Unknown',
              wallet: post.originalReply.authorWallet,
              userTheme: post.originalReply.author?.themeColor,
              content: post.originalReply.content || '',
              likes: post.originalReply.likeCount || 0,
              replies: 0, // Replies don't track reply count
              tips: Number(post.originalReply.tipCount) || 0,
              comments: 0, // Replies don't track reply count
              reposts: post.originalReply.repostCount || 0,
              time: new Date(post.originalReply.createdAt).toLocaleString(),
              createdAt: post.originalReply.createdAt,
              isPremium: post.originalReply.author?.tier === 'premium' || post.originalReply.author?.tier === 'vip',
              image: post.originalReply.imageUrl,
              avatar: post.originalReply.author?.nftAvatar || null,
            } : undefined
          ) : undefined,
        }));

        const sortedPosts = [...transformedPosts].sort((a, b) => {
          if (a.isShoutout && !b.isShoutout) return -1;
          if (!a.isShoutout && b.isShoutout) return 1;
          return 0;
        });

        // The backend only sends the active shoutout in the posts array
        // (queued ones are in shoutoutQueue metadata only).
        // The active shoutout always has expiresAt set by the backend — trust it.
        // This means refreshing doesn't reset the timer.
        const postsWithTimers = sortedPosts.map(p => {
          if (p.isShoutout) {
            activeShoutoutIdRef.current = p.id;
            // Backend sets expiresAt when it activates the shoutout — just use it
            return p;
          }
          return p;
        });

        // Resolve avatars (mint address → image URL)
        const postsWithAvatars = await resolvePostAvatars(postsWithTimers as Post[]);

        // Track all post IDs
        postsWithAvatars.forEach(post => addedPostIds.current.add(post.id));

        setPosts(postsWithAvatars);
        setCurrentPage(1);
        setHasMore(response.posts.length === POSTS_PER_PAGE);

        // Update shoutout queue state from backend response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((response as any).shoutoutQueue) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const queueData = (response as any).shoutoutQueue;
          logger.log('Shoutout queue data:', queueData);
          setShoutoutQueueInfo({
            activeShoutout: queueData.active,
            queuedShoutouts: queueData.queued || []
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch posts from backend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize posts when component mounts (run once)
  useEffect(() => {
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch posts when page becomes visible (throttled to max once per 30 seconds)
  useEffect(() => {
    let lastFetchTime = Date.now();

    const handleVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastFetchTime > 30000) {
        lastFetchTime = Date.now();
        fetchPosts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for theme color changes and update cached posts
  useEffect(() => {
    const handleThemeColorUpdate = (event: CustomEvent) => {
      const { newColor } = event.detail;
      const userWallet = publicKey?.toBase58();

      if (!userWallet) return;

      console.log('🎨 Theme color updated, updating cached posts to:', newColor);

      // Update all posts where the current user is the author or reposter
      setPosts(prevPosts => prevPosts.map(post => {
        // If this post was created by the current user, update their theme
        if (post.wallet === userWallet) {
          return { ...post, userTheme: newColor };
        }
        return post;
      }));

      // Also update the current user theme state
      setCurrentUserTheme(newColor);
    };

    window.addEventListener('themeColorUpdated', handleThemeColorUpdate as EventListener);

    return () => {
      window.removeEventListener('themeColorUpdated', handleThemeColorUpdate as EventListener);
    };
  }, [publicKey]);

  // WebSocket connection for real-time post updates
  useEffect(() => {
    // Check if we already have an active connection with listeners
    if (socketRef.current?.connected) {
      logger.log('⚠️ WebSocket already connected, skipping');
      return;
    }

    // If we have a socket instance, reuse it
    if (!socketRef.current) {
      logger.log('🔌 Initializing new WebSocket connection');
      // Connect to WebSocket server
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      socketRef.current = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socketRef.current.on('connect', () => {
        logger.log('✅ WebSocket connected');
      });

      socketRef.current.on('disconnect', () => {
        logger.log('❌ WebSocket disconnected');
      });
    } else {
      logger.log('🔌 Reconnecting existing WebSocket');
      socketRef.current.connect();
    }

    // Remove any existing 'new_post' listeners to prevent duplicates
    socketRef.current.off('new_post');

    // Listen for new posts (always set up fresh listener)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketRef.current.on('new_post', async (newPost: any) => {
      logger.log('📨 Received new post via WebSocket:', newPost.id);

      // Transform the new post to match frontend format (same as in fetchPosts)
      const transformedPost = {
        ...newPost,
        user: newPost.author?.username || newPost.author?.snsUsername || newPost.authorWallet?.slice(0, 15) || 'Unknown',
        wallet: newPost.authorWallet,
        userTheme: newPost.author?.themeColor,
        time: new Date(newPost.createdAt).toLocaleString(),
        createdAt: newPost.createdAt, // Keep raw timestamp for sorting
        likes: newPost.likeCount || 0,
        comments: newPost.replyCount || 0,
        reposts: newPost.repostCount || 0,
        tips: Number(newPost.tipAmount) || 0,
        image: newPost.imageUrl,
        avatar: await resolveAvatar(newPost.author?.nftAvatar),
        isPremium: newPost.author?.tier === 'premium' || newPost.author?.tier === 'vip',
        shoutoutExpiresAt: newPost.shoutoutExpiresAt,
        // Map originalPost to repostedPost for reposts
        repostedBy: newPost.isRepost ? (newPost.author?.username || newPost.author?.snsUsername || newPost.authorWallet?.slice(0, 15)) : undefined,
        repostedPost: newPost.isRepost ? (
          newPost.originalPost ? {
            id: newPost.originalPost.id,
            user: newPost.originalPost.author?.username || newPost.originalPost.author?.snsUsername || newPost.originalPost.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: newPost.originalPost.authorWallet,
            userTheme: newPost.originalPost.author?.themeColor,
            content: newPost.originalPost.content || '',
            likes: newPost.originalPost.likeCount || 0,
            replies: newPost.originalPost.replyCount || 0,
            tips: Number(newPost.originalPost.tipAmount) || 0,
            comments: newPost.originalPost.replyCount || 0,
            reposts: newPost.originalPost.repostCount || 0,
            time: new Date(newPost.originalPost.createdAt).toLocaleString(),
            createdAt: newPost.originalPost.createdAt,
            isPremium: newPost.originalPost.author?.tier === 'premium' || newPost.originalPost.author?.tier === 'vip',
            image: newPost.originalPost.imageUrl,
            avatar: await resolveAvatar(newPost.originalPost.author?.nftAvatar),
          } : newPost.originalReply ? {
            // Reply repost
            id: newPost.originalReply.id,
            user: newPost.originalReply.author?.username || newPost.originalReply.author?.snsUsername || newPost.originalReply.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: newPost.originalReply.authorWallet,
            userTheme: newPost.originalReply.author?.themeColor,
            content: newPost.originalReply.content || '',
            likes: newPost.originalReply.likeCount || 0,
            replies: 0,
            tips: Number(newPost.originalReply.tipCount) || 0,
            comments: 0,
            reposts: newPost.originalReply.repostCount || 0,
            time: new Date(newPost.originalReply.createdAt).toLocaleString(),
            createdAt: newPost.originalReply.createdAt,
            isPremium: newPost.originalReply.author?.tier === 'premium' || newPost.originalReply.author?.tier === 'vip',
            image: newPost.originalReply.imageUrl,
            avatar: await resolveAvatar(newPost.originalReply.author?.nftAvatar),
          } : undefined
        ) : undefined,
      };

      // Add new post to the feed in chronological order (avoiding duplicates)
      setPosts(prevPosts => {
        // Check both the posts array AND our tracking Set
        const existsInArray = prevPosts.some(p => p.id === transformedPost.id);
        const existsInSet = addedPostIds.current.has(transformedPost.id);

        if (existsInArray || existsInSet) {
          logger.log('⚠️ Post already exists in feed, skipping duplicate:', transformedPost.id);
          return prevPosts;
        }

        // Track this post ID to prevent future duplicates
        addedPostIds.current.add(transformedPost.id);
        logger.log('✨ Adding new post to feed:', transformedPost.id);

        // If it's a shoutout, check queue logic
        if (transformedPost.isShoutout) {
          const hasActiveShoutout = prevPosts.some(p => p.isShoutout);
          if (hasActiveShoutout) {
            // Queue it, don't show in feed
            setShoutoutQueue(q => {
              if (q.some(s => s.id === transformedPost.id)) return q;
              return [...q, transformedPost as Post];
            });
            return prevPosts;
          }
          // No active shoutout — this becomes active
          return [transformedPost as Post, ...prevPosts];
        }

        // For regular posts, insert in chronological order based on createdAt timestamp
        // If createdAt is not available, add to the top of regular posts (after shoutouts)
        if (!transformedPost.createdAt) {
          const firstNonShoutoutIndex = prevPosts.findIndex(p => !p.isShoutout);
          if (firstNonShoutoutIndex === -1) {
            return [...prevPosts, transformedPost as Post];
          }
          const newPosts = [...prevPosts];
          newPosts.splice(firstNonShoutoutIndex, 0, transformedPost as Post);
          return newPosts;
        }

        const newPostTime = new Date(transformedPost.createdAt).getTime();

        // Find the first shoutout/non-shoutout boundary
        const firstNonShoutoutIndex = prevPosts.findIndex(p => !p.isShoutout);
        const startIndex = firstNonShoutoutIndex === -1 ? prevPosts.length : firstNonShoutoutIndex;

        // Find the correct position based on timestamp (newest first)
        let insertIndex = startIndex;
        for (let i = startIndex; i < prevPosts.length; i++) {
          // If existing post doesn't have createdAt, treat it as older
          if (!prevPosts[i].createdAt) {
            insertIndex = i;
            break;
          }
          const existingPostTime = new Date(prevPosts[i].createdAt!).getTime();
          if (newPostTime > existingPostTime) {
            insertIndex = i;
            break;
          }
          insertIndex = i + 1;
        }

        const newPosts = [...prevPosts];
        newPosts.splice(insertIndex, 0, transformedPost as Post);
        logger.log('📍 Inserted post at index:', insertIndex, 'timestamp:', transformedPost.createdAt);
        return newPosts;
      });
    });

    // Remove any existing 'post_update' listeners to prevent duplicates
    socketRef.current.off('post_update');

    // Listen for post updates (likes, tips, replies, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketRef.current.on('post_update', (update: any) => {
      logger.log('📨 Received post update via WebSocket:', update);

      setPosts(prevPosts => {
        return prevPosts.map(post => {
          if (post.id === update.postId) {
            logger.log('🔄 Updating post:', post.id, 'with:', update.updates);
            return {
              ...post,
              likes: update.updates.likeCount !== undefined ? update.updates.likeCount : post.likes,
              tips: update.updates.tipAmount !== undefined ? Number(update.updates.tipAmount) : post.tips,
              comments: update.updates.replyCount !== undefined ? update.updates.replyCount : post.comments,
            };
          }
          return post;
        });
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        logger.log('🔌 Cleaning up WebSocket listeners');
        // Remove the listener to prevent duplicates when effect runs again
        socketRef.current.off('new_post');
        socketRef.current.off('post_update');
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
        // Keep the socket instance so it can reconnect on remount
      }
    };
  }, []);

  // Join user room for targeted notifications + listen for new_notification events
  useEffect(() => {
    if (!socketRef.current || !connected || !isAuthenticated || !publicKey) return;

    const walletAddress = publicKey.toBase58();

    // Join user-specific room
    socketRef.current.emit('join_user', walletAddress);

    // Listen for real-time notifications
    socketRef.current.off('new_notification');
    socketRef.current.on('new_notification', () => {
      setNotificationCount(prev => prev + 1);
    });

    return () => {
      socketRef.current?.off('new_notification');
    };
  }, [connected, isAuthenticated, publicKey]);

  // Poll notifications count every 30s as fallback
  useEffect(() => {
    if (!connected || !isAuthenticated || !token) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await notificationsAPI.getNotifications(token, true);
        setNotificationCount(response.notifications.length);
      } catch {
        // silent
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [connected, isAuthenticated, token]);

  // Fetch user interactions for loaded posts
  useEffect(() => {
    const fetchUserInteractions = async () => {
      if (!connected || !isAuthenticated || !token || posts.length === 0) {
        return;
      }

      try {
        const postIds = posts.map(post => String(post.id));
        const response = await interactionsAPI.getUserInteractions(postIds, token);

        if (response.success) {
          setPostInteractions(response.interactions as {[key: number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}});
          logger.log('User interactions loaded:', response.interactions);
        }
      } catch (error) {
        logger.error('Failed to fetch user interactions:', error);
      }
    };

    fetchUserInteractions();
  }, [posts, connected, isAuthenticated, token]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      callback: () => {
        if (connected) {
          setShowCreatePostModal(true);
        }
      },
      description: 'New post',
    },
    {
      key: '/',
      callback: () => {
        setShowSearchModal(true);
      },
      description: 'Search',
    },
    {
      key: 'Escape',
      callback: () => {
        // Close any open modal
        if (showCreatePostModal) setShowCreatePostModal(false);
        if (showSearchModal) setShowSearchModal(false);
        if (showTipModal) setShowTipModal(false);
        if (showShareModal) setShowShareModal(false);
        if (showReplyModal) setShowReplyModal(false);
        if (showPostOptionsModal) setShowPostOptionsModal(false);
        if (showMobileMenu) setShowMobileMenu(false);
      },
      description: 'Close modal',
    },
  ], { enabled: connected });

  // Helper function to extract URLs from text
  const extractUrls = (text: string): string[] => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Modal handlers
  const handlePostCreate = (post: Post) => {
    if (post.isShoutout) {
      // Mark as seen BEFORE setPosts so socket handler's dedup catches it immediately
      addedPostIds.current.add(post.id);
      // Use setPosts callback to read latest state (avoids stale closure)
      setPosts(prev => {
        const hasActiveShoutout = prev.some(p => p.isShoutout);

        if (hasActiveShoutout) {
          // Add to queue — timer does NOT start until it becomes active
          setShoutoutQueue(q => [...q, post]);
          showSuccess('Shoutout queued! It will go live when the current one expires.');
          return prev; // Don't modify posts — just queue it
        } else {
          // No active shoutout — activate immediately with timer starting now
          const now = Date.now();
          const duration = post.shoutoutDuration || 10;
          const activePost = {
            ...post,
            shoutoutStartTime: now,
            shoutoutExpiresAt: new Date(now + duration * 60 * 1000).toISOString(),
          };
          activeShoutoutIdRef.current = post.id;
          const regularPosts = prev.filter(p => !p.isShoutout);
          showSuccess('Shoutout created successfully!');
          return [activePost, ...regularPosts];
        }
      });
    } else {
      // Regular post: insert after shoutouts
      setPosts(prev => {
        const shoutouts = prev.filter(p => p.isShoutout);
        const regularPosts = prev.filter(p => !p.isShoutout);
        return [...shoutouts, post, ...regularPosts];
      });
      showSuccess('Post created successfully!');
    }
  };

  // When a shoutout expires, remove it and refetch posts so the backend
  // serves the next queued shoutout with a fresh timer
  const handleShoutoutExpire = (expiredId: string | number) => {
    logger.log('Shoutout expired:', expiredId);
    // Remove expired shoutout immediately for instant UI feedback
    setPosts(prev => prev.filter(p => p.id !== expiredId));
    setShoutoutQueue([]);
    // Refetch posts — backend will serve the next active shoutout
    fetchPosts();
  };

  const handleRegularPost = async () => {
    if (isPosting) return;
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to post');
      return;
    }

    // Get drawing data URL: from saved state, or from canvas if still open
    let drawingUrl = drawingDataUrl;
    if (!drawingUrl && showDrawCanvas) {
      if (drawingSaveRef.current) drawingUrl = drawingSaveRef.current();
      if (!drawingUrl) {
        const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvasEl) drawingUrl = canvasEl.toDataURL('image/png');
      }
    }

    // Collect regular file uploads (non-drawing images from file picker)
    const filesToUpload = [...selectedFiles];

    if (!composeText.trim() && filesToUpload.length === 0 && !selectedGif && !drawingUrl) return;

    setIsPosting(true);

    try {

      // Upload regular files (from file picker) via the upload API
      let imageUrl: string | undefined;
      if (filesToUpload.length > 0) {
        const imageFile = filesToUpload[0];
        if (imageFile.type.startsWith('image/')) {
          try {
            const uploadResponse = await uploadAPI.uploadImage(imageFile, token);
            imageUrl = uploadResponse.url;
          } catch (uploadError: unknown) {
            const msg = uploadError instanceof Error ? uploadError.message : 'Unknown error';
            showError('Upload failed: ' + msg);
            setIsPosting(false);
            return;
          }
        }
      }

      // Prepare post data
      const postData: { topic: string; content?: string; subtopic: string; imageUrl?: string } = {
        topic: 'General',
        subtopic: 'discussion',
      };

      if (composeText.trim()) {
        postData.content = composeText.trim();
      }

      // Priority: GIF > uploaded file > drawing data URL (sent directly, backend uploads to Cloudinary)
      if (selectedGif) {
        postData.imageUrl = selectedGif;
      } else if (imageUrl) {
        postData.imageUrl = imageUrl;
      } else if (drawingUrl) {
        postData.imageUrl = drawingUrl;
      }

      if (!postData.content && !postData.imageUrl) {
        showError('Nothing to post.');
        setIsPosting(false);
        return;
      }

      // Create post via backend API
      const newPost = await postsAPI.createPost(postData, token);

      logger.log('Post created successfully:', newPost);

      // Extract the post from the response (backend returns {success: true, post: {...}})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post: any = (newPost as { post?: unknown }).post || newPost;

      // Add post to feed immediately as fallback (WebSocket may not be connected)
      // The WebSocket dedup logic (addedPostIds) will prevent duplicates if the event also arrives
      setPosts(prev => {
        const shoutouts = prev.filter(p => p.isShoutout);
        const regularPosts = prev.filter(p => !p.isShoutout);
        return [...shoutouts, post, ...regularPosts];
      });
      logger.log('✅ Post created and added to feed. Post ID:', post.id);

      setComposeText('');
      setSelectedFiles([]);
      setSelectedGif(null);
      setDrawingDataUrl(null);
      setShowDrawCanvas(false);
      showSuccess('Post created successfully!');
    } catch (error) {
      logger.error('Failed to create post:', error);
      showError('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostOptionsClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostOptionsModal(true);
  };


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    logger.log('Files selected:', files.length, files);
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    logger.log('Valid files:', validFiles.length, validFiles);
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 4));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    setComposeText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };


  const handleDrawingSave = (dataUrl: string) => {
    setDrawingDataUrl(dataUrl);
    setShowDrawCanvas(false);
    showSuccess('Drawing added to your post!');
  };

  // Inline reply handler
  const submitInlineReply = async (post: Post) => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to reply');
      return;
    }
    if (!inlineReplyText.trim()) return;

    setIsPostingInlineReply(true);
    try {
      const response = await repliesAPI.createReply(
        String(post.id),
        { content: inlineReplyText.trim() },
        token
      );

      if (response.reply) {
        setPosts(prev => prev.map(p => {
          if (p.id === post.id) {
            return { ...p, replies: p.replies + 1, comments: (p.comments || 0) + 1 } as Post;
          }
          return p;
        }));
        markReplied(post.id);
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

  // Interaction handlers
  const toggleLike = async (postId: number | string) => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to like posts');
      return;
    }

    try {
      const id = String(postId);
      const currentlyLiked = postInteractions[id]?.liked || postInteractions[postId]?.liked || false;

      // Optimistically update UI
      setPostInteractions(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...prev[postId],
          liked: !currentlyLiked
        }
      }));

      // Update post like count optimistically
      setPosts(prev => prev.map(p => {
        if (String(p.id) === id) {
          return {
            ...p,
            likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1
          };
        }
        return p;
      }));

      // Call backend API
      const response = await interactionsAPI.likePost(id, token);
      logger.log('Like response:', response);

    } catch (error) {
      logger.error('Failed to like post:', error);

      // Revert on error
      const id = String(postId);
      const currentlyLiked = postInteractions[id]?.liked || postInteractions[postId]?.liked || false;
      setPostInteractions(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...prev[postId],
          liked: currentlyLiked
        }
      }));

      setPosts(prev => prev.map(p => {
        if (String(p.id) === id) {
          return {
            ...p,
            likes: currentlyLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
          };
        }
        return p;
      }));

      showError('Failed to like post. Please try again.');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const handleRepostResponse = async (postId: number, response: any) => {
    const isCurrentlyReposted = postInteractions[postId]?.reposted;

    if (response.success) {
      if (!isCurrentlyReposted && response.repostPost) {
        // Check if WebSocket already added this repost
        const alreadyExists = posts.some(p => p.id === response.repostPost.id);

        if (!alreadyExists) {
          // WebSocket hasn't added it yet, add it locally
          logger.log('WebSocket hasn\'t added repost yet, adding locally');

          const post = response.repostPost;
          const transformedRepost = {
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
            avatar: await resolveAvatar(post.author?.nftAvatar),
            isPremium: post.author?.tier === 'premium' || post.author?.tier === 'vip',
            shoutoutExpiresAt: post.shoutoutExpiresAt,
            repostedBy: post.isRepost ? (post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15)) : undefined,
            repostedPost: post.isRepost ? (
              post.originalPost ? {
                // Post repost
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
                avatar: await resolveAvatar(post.originalPost.author?.nftAvatar),
              } : post.originalReply ? {
                // Reply repost
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
                avatar: await resolveAvatar(post.originalReply.author?.nftAvatar),
              } : undefined
            ) : undefined,
          };

          setPosts(prev => [transformedRepost as Post, ...prev]);
          addedPostIds.current.add(response.repostPost.id);
        } else {
          logger.log('Repost already added by WebSocket');
        }
      } else if (isCurrentlyReposted) {
        // Remove the repost from feed
        setPosts(prev => prev.filter(p => !(p.isRepost && p.repostedPost?.id === postId)));
      }

      // Toggle repost state
      setPostInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          reposted: !isCurrentlyReposted
        }
      }));

      // Update repost count on the original post/reply
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            reposts: !isCurrentlyReposted ? (p.reposts ?? 0) + 1 : (p.reposts ?? 0) - 1
          };
        }
        return p;
      }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleRepost = async (postId: number | string, comment?: string) => {
    const originalPost = posts.find(p => String(p.id) === String(postId));
    if (!originalPost) return;

    // Prevent reposting your own post
    if (publicKey && (originalPost.wallet === publicKey.toBase58() || originalPost.user === publicKey.toBase58())) {
      showError("You can't repost your own post");
      return;
    }

    const isCurrentlyReposted = postInteractions[postId]?.reposted;

    try {
      // Call backend API to toggle repost (pass comment if provided)
      const response = await interactionsAPI.repostPost(String(postId), token || '', comment);

      if (response.success) {
        if (!isCurrentlyReposted && response.repostPost) {
          // Add the repost to the feed immediately
          const repost = response.repostPost;
          const transformedRepost = {
            ...repost,
            user: repost.author?.username || repost.author?.snsUsername || repost.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: repost.authorWallet,
            userTheme: repost.author?.themeColor,
            time: new Date(repost.createdAt).toLocaleString(),
            createdAt: repost.createdAt,
            likes: repost.likeCount || 0,
            comments: repost.replyCount || 0,
            reposts: repost.repostCount || 0,
            tips: Number(repost.tipAmount) || 0,
            image: repost.imageUrl,
            avatar: await resolveAvatar(repost.author?.nftAvatar),
            isPremium: repost.author?.tier === 'premium' || repost.author?.tier === 'vip',
            repostedBy: repost.author?.username || repost.author?.snsUsername || repost.authorWallet?.slice(0, 15),
            repostedPost: repost.originalPost ? {
              id: repost.originalPost.id,
              user: repost.originalPost.author?.username || repost.originalPost.author?.snsUsername || repost.originalPost.authorWallet?.slice(0, 15) || 'Unknown',
              wallet: repost.originalPost.authorWallet,
              userTheme: repost.originalPost.author?.themeColor,
              content: repost.originalPost.content || '',
              likes: repost.originalPost.likeCount || 0,
              replies: repost.originalPost.replyCount || 0,
              tips: Number(repost.originalPost.tipAmount) || 0,
              comments: repost.originalPost.replyCount || 0,
              reposts: repost.originalPost.repostCount || 0,
              time: new Date(repost.originalPost.createdAt).toLocaleString(),
              createdAt: repost.originalPost.createdAt,
              isPremium: repost.originalPost.author?.tier === 'premium' || repost.originalPost.author?.tier === 'vip',
              image: repost.originalPost.imageUrl,
              avatar: await resolveAvatar(repost.originalPost.author?.nftAvatar),
            } : repost.originalReply ? {
              // Reply repost
              id: repost.originalReply.id,
              user: repost.originalReply.author?.username || repost.originalReply.author?.snsUsername || repost.originalReply.authorWallet?.slice(0, 15) || 'Unknown',
              wallet: repost.originalReply.authorWallet,
              userTheme: repost.originalReply.author?.themeColor,
              content: repost.originalReply.content || '',
              likes: repost.originalReply.likeCount || 0,
              replies: 0,
              tips: Number(repost.originalReply.tipCount) || 0,
              comments: 0,
              reposts: repost.originalReply.repostCount || 0,
              time: new Date(repost.originalReply.createdAt).toLocaleString(),
              createdAt: repost.originalReply.createdAt,
              isPremium: repost.originalReply.author?.tier === 'premium' || repost.originalReply.author?.tier === 'vip',
              image: repost.originalReply.imageUrl,
              avatar: await resolveAvatar(repost.originalReply.author?.nftAvatar),
            } : undefined,
          };

          // Track the repost ID to prevent WebSocket duplicates
          addedPostIds.current.add(transformedRepost.id);

          // Add to feed at the top (after shoutouts)
          setPosts(prev => {
            // Check if it already exists to avoid duplicates from WebSocket
            if (prev.some(p => p.id === transformedRepost.id)) {
              logger.log('Repost already exists in feed, skipping:', transformedRepost.id);
              return prev;
            }

            logger.log('Adding repost to feed:', transformedRepost.id);

            // Find the first non-shoutout post
            const firstNonShoutoutIndex = prev.findIndex(p => !p.isShoutout);
            if (firstNonShoutoutIndex === -1) {
              // No regular posts, add at the end
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return [...prev, transformedRepost as any];
            }
            // Insert after shoutouts but before other posts
            return [
              ...prev.slice(0, firstNonShoutoutIndex),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              transformedRepost as any,
              ...prev.slice(firstNonShoutoutIndex)
            ];
          });

          showSuccess('Post reposted successfully!');
        } else {
          // Remove the repost from feed
          setPosts(prev => prev.filter(p => !(p.isRepost && p.repostedPost?.id === postId)));
          showSuccess('Repost removed!');
        }

        // Toggle repost state
        setPostInteractions(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            reposted: !isCurrentlyReposted
          }
        }));

        // Update repost count on the original post
        setPosts(prev => prev.map(p => {
          if (String(p.id) === String(postId)) {
            return {
              ...p,
              reposts: !isCurrentlyReposted ? (p.reposts ?? 0) + 1 : Math.max(0, (p.reposts ?? 0) - 1)
            };
          }
          return p;
        }));
      }
    } catch (error) {
      logger.error('Failed to toggle repost:', error);
      showError('Failed to repost. Please try again.');
    }
  };

  const markReplied = (postId: string | number) => {
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        replied: true
      }
    }));
  };

  const markTipped = (postId: string | number) => {
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        tipped: true
      }
    }));
  };


  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Standardized static background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
      </div>
      {/* Static gradient orbs for visual depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/6 to-korus-secondary/4 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/4 to-korus-primary/6 rounded-full blur-[70px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/3 to-korus-secondary/3 rounded-full blur-[60px]" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Main Content Container — centered 1280px max like mockup */}
      <div className="flex min-h-screen max-w-[1280px] mx-auto">
        <LeftSidebar
          onNotificationsToggle={() => setShowNotifications(!showNotifications)}
          onPostButtonClick={() => setShowCreatePostModal(true)}
          onSearchClick={() => setShowSearchModal(true)}
          notificationCount={notificationCount}
        />
        {/* Main Feed */}
        <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">
        {/* Main app - only accessible when connected */}
            {/* Header Navigation */}
            <div className="sticky top-0 z-10 bg-[var(--color-background)]/85 backdrop-blur-[12px] border-b border-[var(--color-border-light)]">
              {/* Mobile controls row */}
              <div className="flex md:hidden items-center justify-between px-2">
                <button
                  onClick={() => setShowMobileMenu(true)}
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
                  onClick={() => setShowSearchModal(true)}
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
                  onClick={() => router.push('/')}
                  className="flex-1 text-center py-4 text-[14px] font-semibold cursor-pointer transition-colors relative text-[var(--color-text)]"
                >
                  For You
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40px] h-[3px] rounded-[3px] bg-[var(--korus-primary)]" />
                </button>
                <button
                  className="flex-1 text-center py-4 text-[14px] font-semibold cursor-pointer transition-colors duration-150 relative text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]"
                >
                  Following
                </button>
                <button
                  className="flex-1 text-center py-4 text-[14px] font-semibold cursor-pointer transition-colors duration-150 relative text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]"
                >
                  Trending
                </button>
              </div>
            </div>

            {/* Compose Post */}
            <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex gap-3">
                {userAvatar ? (
                  <div className="w-[42px] h-[42px] rounded-full flex-shrink-0 overflow-hidden">
                    <Image
                      src={userAvatar}
                      alt="Your avatar"
                      width={42}
                      height={42}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold text-sm">
                      {publicKey?.toBase58().slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder="What's happening on Solana?"
                    className="bg-transparent text-[var(--color-text)] text-[16px] placeholder-[#525252] w-full resize-none min-h-[48px] border-none outline-none leading-relaxed"
                    rows={1}
                  />

                  {/* Inline Drawing Canvas */}
                  {showDrawCanvas && (
                    <div className="mt-3 p-3 bg-white/[0.04] border border-[var(--color-border-light)] rounded-xl">
                      <DrawingCanvasInline
                        onSave={handleDrawingSave}
                        onClose={() => setShowDrawCanvas(false)}
                        saveRef={drawingSaveRef}
                      />
                    </div>
                  )}

                  {/* Drawing Preview */}
                  {drawingDataUrl && (
                    <div className="relative group mt-4 inline-block">
                      <img
                        src={drawingDataUrl}
                        alt="Drawing preview"
                        className="max-w-[200px] h-auto rounded-xl border border-[var(--color-border-light)]"
                      />
                      <button
                        onClick={() => setDrawingDataUrl(null)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* File Previews */}
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          {file.type.startsWith('image/') ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt="Upload preview"
                              width={200}
                              height={128}
                              className="max-w-full h-auto rounded-xl border border-[var(--color-border-light)]"
                            />
                          ) : (
                            <div className="w-full h-32 bg-white/[0.06] border border-[var(--color-border-light)] rounded-xl flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-xs text-[var(--color-text-secondary)] truncate px-2">{file.name}</p>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Post Options */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-light)]">
                    <div className="flex items-center gap-0.5">
                      {/* Image Upload */}
                      <label className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] transition-all cursor-pointer">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleFileSelect}
                        />
                      </label>
                      {/* GIF Button */}
                      <button
                        onClick={() => setShowGifPicker(!showGifPicker)}
                        className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                          showGifPicker
                            ? 'text-[var(--korus-primary)] bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                            : 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                        }`}
                      >
                        <span className="text-xs font-bold">GIF</span>
                      </button>
                      {/* Emoji Button */}
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                          showEmojiPicker
                            ? 'text-[var(--korus-primary)] bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                            : 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                        }`}
                      >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {/* Draw Button */}
                      <button
                        onClick={() => setShowDrawCanvas(!showDrawCanvas)}
                        className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                          showDrawCanvas
                            ? 'text-[var(--korus-primary)] bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                            : 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)]'
                        }`}
                      >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (composeText.trim() || selectedFiles.length > 0 || drawingDataUrl) {
                            setShowShoutoutModal(true);
                          }
                        }}
                        disabled={isPosting || (!composeText.trim() && selectedFiles.length === 0 && !drawingDataUrl)}
                        className="px-4 py-2 rounded-[20px] border border-[var(--korus-primary)] text-[13px] font-bold hover:bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed leading-none"
                        style={{ color: 'var(--korus-primary)' }}
                      >
                        📢 Shoutout
                      </button>
                      <button
                        onClick={handleRegularPost}
                        disabled={isPosting || (!composeText.trim() && selectedFiles.length === 0 && !showDrawCanvas && !drawingDataUrl)}
                        className="px-5 py-2 rounded-[20px] bg-[var(--korus-primary)] text-[14px] font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-none"
                        style={{ color: '#000' }}
                      >
                        {isPosting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
            </div>

            {/* Shoutout Queue Indicator */}
            {effectiveQueueInfo.queuedShoutouts.length > 0 && (
              <div className="bg-white/[0.06] border border-[var(--color-border-light)] rounded-xl p-4 mb-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-korus-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold">Shoutout Queue:</span>
                  </div>
                  <span className="text-white">
                    {effectiveQueueInfo.queuedShoutouts.length} shoutout{effectiveQueueInfo.queuedShoutouts.length > 1 ? 's' : ''} waiting
                  </span>
                </div>
              </div>
            )}

            {/* Feed Posts */}
            <div>
          {isLoading ? (
            <FeedSkeleton count={5} />
          ) : (
            // Deduplicate posts, only show the first (active) shoutout, hide rest
            (() => {
              let shoutoutShown = false;
              return Array.from(new Map(posts.map(post => [post.id, post])).values()).filter(post => {
                if (post.isShoutout) {
                  if (hideShoutouts || shoutoutShown) return false;
                  shoutoutShown = true;
                  return true;
                }
                return true;
              });
            })().map((post) => (
            <div
              key={post.id}
              className={`transition-colors cursor-pointer group ${
                post.isShoutout
                  ? 'px-5 py-2'
                  : 'px-5 py-4 border-b border-[var(--color-border-light)] hover:bg-white/[0.02]'
              }`}
              onClick={() => router.push(`/post/${post.repostedPost?.id || post.id}`)}
            >
              {/* Shoutout Banner — standalone, no post card */}
              {post.isShoutout && (
                <div className="bg-gradient-to-r from-[color-mix(in_srgb,var(--korus-primary)_20%,transparent)] to-[color-mix(in_srgb,var(--korus-secondary)_12%,transparent)] border border-[color-mix(in_srgb,var(--korus-primary)_30%,transparent)] rounded-[16px] px-5 py-4 flex items-center justify-between gap-3 hover:brightness-110 transition-all duration-150">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="text-2xl flex-shrink-0">📢</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[14px] font-black uppercase tracking-widest" style={{ color: 'var(--korus-primary)' }}>SHOUTOUT</span>
                        <span className="text-[14px] font-bold text-[var(--color-text)]">@{truncateAddress(post.user)}</span>
                      </div>
                      <p className="text-[15px] font-medium text-[var(--color-text)] mt-1 truncate">{post.content?.slice(0, 80)}{(post.content?.length ?? 0) > 80 ? '...' : ''}</p>
                    </div>
                  </div>
                  {post.shoutoutDuration && (post.shoutoutExpiresAt || post.shoutoutStartTime) && (
                    <div className="flex-shrink-0">
                      <ShoutoutCountdown
                        expiresAt={post.shoutoutExpiresAt}
                        startTime={post.shoutoutStartTime}
                        duration={post.shoutoutDuration}
                        onExpire={() => handleShoutoutExpire(post.id)}
                      />
                    </div>
                  )}
                </div>
              )}

              {!post.isShoutout && <div>
                {/* Repost Header */}
                {post.repostedBy && (
                  <div className="flex items-center gap-2 ml-[52px] mb-1.5 text-[13px] text-[var(--color-text-tertiary)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>
                      <Link
                        href={`/profile/${post.wallet}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold hover:underline"
                      >
                        {truncateAddress(post.repostedBy)}
                      </Link>
                      {' '}reposted
                    </span>
                  </div>
                )}

                {/* Post Header with Avatar */}
                <div className="flex items-center gap-3">
                  {/* Avatar — for reposts show the original post author */}
                  {(() => {
                    const displayAvatar = post.repostedPost?.avatar || post.avatar;
                    const displayUser = post.repostedPost?.user || post.user;
                    return displayAvatar ? (
                      <div className="w-[42px] h-[42px] rounded-full flex-shrink-0 overflow-hidden">
                        <Image
                          src={displayAvatar}
                          alt={`${displayUser} avatar`}
                          width={42}
                          height={42}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-[14px] font-bold text-black flex-shrink-0">
                        {displayUser.slice(0, 2).toUpperCase()}
                      </div>
                    );
                  })()}

                  {/* Header Info — for reposts, show original post author */}
                  {(() => {
                    const displayPost = post.repostedPost || post;
                    const displayWallet = displayPost.wallet || displayPost.user;
                    const displayUser = displayPost.user;
                    const displayPremium = displayPost.isPremium;
                    const displayTime = displayPost.createdAt || displayPost.time;
                    return (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Link
                      href={`/profile/${displayWallet}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`font-bold text-[15px] hover:underline cursor-pointer ${post.isShoutout ? 'text-korus-primary' : 'text-[var(--color-text)]'}`}
                    >
                      {truncateAddress(displayUser)}
                    </Link>

                    {/* Premium Badge */}
                    {displayPremium && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                        <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                        </svg>
                      </div>
                    )}

                    <span className="text-[14px] text-[var(--color-text-secondary)]">@{truncateAddress(displayUser)}</span>
                    <span className="text-[#525252] text-[12px]">·</span>
                    <span className="text-[13px] text-[#525252] hover:text-[var(--color-text-secondary)] cursor-pointer">{formatRelativeTime(displayTime)}</span>

                    {/* Sponsored Badge */}
                    {post.isSponsored && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 ml-2">
                        Sponsored
                      </span>
                    )}

                    {/* More button */}
                    <div className="ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostOptionsClick(post);
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[#b0b0b0] hover:bg-white/[0.06] transition-colors duration-150 opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                    );
                  })()}
                </div>

                {/* Post Body - indented below avatar */}
                <div className="ml-[52px] mt-0.5">
                  {/* Post Text — for reposts, show original post content */}
                  {(post.repostedPost?.content || post.content) && (
                    <SafeContent
                      content={post.repostedPost?.content || post.content}
                      className="text-[15px] leading-[1.55] text-[#e5e5e5] whitespace-pre-wrap break-words"
                      allowLinks={true}
                      allowFormatting={true}
                    />
                  )}

                  {/* Link Preview */}
                  {extractUrls(post.repostedPost?.content || post.content).map((url, index) => (
                    <div key={index} className="mb-3">
                      <LinkPreview url={url} />
                    </div>
                  ))}

                  {/* Video Player */}
                  {post.video && (
                    <div className="mb-3">
                      <VideoPlayer videoUrl={post.video} />
                    </div>
                  )}

                  {/* Post Image — for reposts, show original post image */}
                  {(post.repostedPost?.image || post.image) && (
                    <div className="mb-3 flex justify-center">
                      <Image
                        src={(post.repostedPost?.image || post.image) as string}
                        alt="Post content"
                        width={600}
                        height={400}
                        className="max-w-full h-auto rounded-xl border border-[var(--color-border-light)]"
                        style={{ maxHeight: '500px', width: 'auto', height: 'auto' }}
                        onError={(e) => {
                          // Hide broken image on error
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-0.5 mt-3 -ml-2">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                        postInteractions[post.id]?.replied
                          ? 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                          : 'text-[var(--color-text-tertiary)] hover:text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (inlineReplyPostId === post.id) {
                          setInlineReplyPostId(null);
                          setInlineReplyText('');
                        } else {
                          setInlineReplyPostId(post.id);
                          setInlineReplyText('');
                          setTimeout(() => inlineReplyRef.current?.focus(), 50);
                        }
                      }}
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{post.comments}</span>
                    </button>

                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 hover:bg-red-500/10"
                      style={{ color: postInteractions[post.id]?.liked ? '#ef4444' : '#737373' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(post.id);
                        if (typeof window !== 'undefined' && 'createParticleExplosion' in window) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = rect.left + rect.width / 2;
                          const y = rect.top + rect.height / 2;
                          (window as Window & { createParticleExplosion: (type: string, x: number, y: number) => void }).createParticleExplosion('like', x, y);
                        }
                      }}
                    >
                      <svg className="w-[18px] h-[18px]" fill={postInteractions[post.id]?.liked ? '#ef4444' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{post.likes}</span>
                    </button>

                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                        postInteractions[post.id]?.reposted
                          ? 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                          : 'text-[var(--color-text-tertiary)] hover:text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRepost(post.id);
                      }}
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{post.reposts ?? 0}</span>
                    </button>

                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                        postInteractions[post.id]?.tipped
                          ? 'text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)]'
                          : 'text-[var(--color-text-tertiary)] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();

                        // Prevent self-tipping
                        if (publicKey && (post.wallet === publicKey.toBase58() || post.author?.walletAddress === publicKey.toBase58())) {
                          showError("You cannot tip your own posts");
                          return;
                        }

                        setPostToTip(post);
                        setShowTipModal(true);
                      }}
                    >
                      <svg className={`w-[18px] h-[18px] ${postInteractions[post.id]?.tipped ? 'text-[#f59e0b]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {post.tips ? <span className={`text-[11px] font-semibold px-1.5 rounded-[6px] ${postInteractions[post.id]?.tipped ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]' : 'bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] text-[var(--korus-primary)]'}`}>{post.tips} SOL</span> : <span>Tip</span>}
                    </button>

                    <button
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.08] transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostToShare(post);
                        setShowShareModal(true);
                      }}
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>

                  {/* Inline Reply */}
                  {inlineReplyPostId === post.id && (
                    <div className="mt-3 flex gap-3" onClick={(e) => e.stopPropagation()}>
                      {userAvatar ? (
                        <div className="w-[32px] h-[32px] rounded-full flex-shrink-0 overflow-hidden">
                          <Image src={userAvatar} alt="You" width={32} height={32} className="w-full h-full object-cover" />
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
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              submitInlineReply(post);
                            }
                            if (e.key === 'Escape') {
                              setInlineReplyPostId(null);
                              setInlineReplyText('');
                            }
                          }}
                          placeholder="Post your reply..."
                          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[16px] px-3 py-2 text-[14px] text-[var(--color-text)] placeholder-[#525252] resize-none outline-none focus:border-[var(--korus-primary)]/50 transition-colors min-h-[36px] max-h-[120px]"
                          rows={1}
                        />
                        <button
                          onClick={() => submitInlineReply(post)}
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
              </div>}
            </div>
          ))
          )}

            {/* Infinite Scroll Sentinel */}
            {!isLoading && posts.length > 0 && (
              <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading more posts...</span>
                  </div>
                )}
                {!hasMore && posts.length >= POSTS_PER_PAGE && (
                  <p className="text-[var(--color-text-secondary)] text-sm">No more posts to load</p>
                )}
              </div>
            )}
            </div>
        </div>
        <RightSidebar
          showNotifications={showNotifications}
          onNotificationsClose={() => setShowNotifications(false)}
          onNotificationCountChange={setNotificationCount}
        />
      </div>
      </div>

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={handlePostCreate}
        queueInfo={effectiveQueueInfo}
      />

      <PostOptionsModal
        isOpen={showPostOptionsModal}
        onClose={() => setShowPostOptionsModal(false)}
        postId={selectedPost?.id || 0}
        postUser={selectedPost?.user || ''}
        isOwnPost={selectedPost?.wallet === publicKey?.toBase58()}
        onDelete={() => {
          // Remove the post from the UI
          if (selectedPost) {
            setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
          }
        }}
      />


      <ShoutoutModal
        isOpen={showShoutoutModal}
        onClose={() => setShowShoutoutModal(false)}
        postContent={composeText}
        onConfirm={async (duration, price, transactionSignature) => {
          logger.log('=== Home Page ShoutoutModal onConfirm called ===');
          logger.log('Duration:', duration);
          logger.log('Price:', price);
          logger.log('Transaction signature:', transactionSignature);
          logger.log('Token:', !!token);
          logger.log('Content:', composeText);

          try {
            // Upload image if needed
            let imageUrl: string | undefined;
            if (selectedFiles.length > 0 && selectedFiles[0].type.startsWith('image/')) {
              logger.log('Uploading image...');
              try {
                const uploadResponse = await uploadAPI.uploadImage(selectedFiles[0], token!);
                imageUrl = uploadResponse.url;
                logger.log('Image uploaded:', imageUrl);
              } catch (uploadError) {
                logger.error('Image upload failed:', uploadError);
                showError('Failed to upload image');
                return;
              }
            }

            // Create post data with shoutout info
            const postData: { content?: string; topic: string; subtopic: string; isShoutout?: boolean; shoutoutDuration?: number; imageUrl?: string; transactionSignature?: string } = {
              topic: 'general',
              subtopic: 'discussion',
              shoutoutDuration: duration,
              transactionSignature,
            };

            // Only include content if there's actual text
            if (composeText.trim()) {
              postData.content = composeText.trim();
            }

            // Add image URL if uploaded or GIF if selected
            if (selectedGif) {
              postData.imageUrl = selectedGif;
            } else if (imageUrl) {
              postData.imageUrl = imageUrl;
            }

            logger.log('Creating shoutout post with data:', postData);

            // Create post via backend API
            logger.log('Calling postsAPI.createPost...');
            const newPost = await postsAPI.createPost(postData, token!);
            logger.log('Shoutout post created successfully:', newPost);

            // Extract the post from the response
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const post: any = (newPost as { post?: unknown }).post || newPost;
            logger.log('Extracted post:', post);

            // Transform the backend response to match the frontend Post type
            // Don't set shoutoutStartTime here — handlePostCreate will set it
            // only if this shoutout becomes immediately active (no queue)
            const transformedPost = {
              ...post,
              user: post.author?.username || post.author?.snsUsername || post.authorWallet || post.author?.walletAddress || publicKey?.toBase58() || 'Unknown',
              wallet: post.authorWallet,
              likes: post.likeCount || 0,
              replies: post.replyCount || 0,
              tips: post.tipCount || 0,
              time: 'now',
              isPremium: false,
              isShoutout: true,
              isSponsored: false,
              shoutoutDuration: duration,
            };
            logger.log('Transformed shoutout post:', transformedPost);

            // Call handlePostCreate to add it to the feed
            handlePostCreate(transformedPost as Post);

            showSuccess(`Shoutout created for ${duration} minutes!`);
            setShowShoutoutModal(false);
            setComposeText('');
            setSelectedFiles([]);
            setSelectedGif(null);
            setShowDrawCanvas(false);
            logger.log('=== Home Page Shoutout Post Creation Complete ===');
          } catch (error: unknown) {
            logger.error('=== Failed to create shoutout post ===');
            logger.error('Error:', error);
            logger.error('Error message:', (error as Error)?.message);
            logger.error('Error response:', (error as { response?: unknown })?.response);
            showError((error as Error)?.message || 'Failed to create shoutout post');
          }
        }}
        queueInfo={effectiveQueueInfo}
      />

      <TipModal
        isOpen={showTipModal}
        onClose={() => {
          setShowTipModal(false);
          setPostToTip(null);
        }}
        recipientUser={postToTip?.wallet || postToTip?.user || ''}
        postId={postToTip?.id}
        onTipSuccess={(amount: number) => {
          if (postToTip?.id) {
            markTipped(postToTip.id);
            // Update the post's tip count
            setPosts(prev => prev.map(p =>
              p.id === postToTip.id
                ? { ...p, tips: (p.tips || 0) + amount, tipCount: (p.tipCount || 0) + 1 }
                : p
            ));
          }
        }}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setPostToShare(null);
        }}
        postId={postToShare?.id || 0}
        postContent={postToShare?.content || ''}
        postUser={postToShare?.user || ''}
      />

      <ReplyModal
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setPostToReply(null);
        }}
        post={postToReply}
        onReplySuccess={(reply) => {
          // Add reply to the parent post's replies array
          setPosts(prev => prev.map(p => {
            if (p.id === postToReply?.id) {
              const existingReplies = ('replyThreads' in p && Array.isArray(p.replyThreads)) ? p.replyThreads : [];
              return {
                ...p,
                replies: p.replies + 1,
                replyThreads: [...existingReplies, reply]
              } as Post;
            }
            return p;
          }));

          // Mark the original post as replied
          if (postToReply?.id) {
            markReplied(postToReply.id);
          }
        }}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={posts}
      />

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelect={(gifUrl) => {
            setSelectedGif(gifUrl);
            setSelectedFiles([]); // Clear any selected files when GIF is chosen
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
