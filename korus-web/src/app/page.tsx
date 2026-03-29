'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { FeedSkeleton } from '@/components/Skeleton';
import { SafeContent } from '@/components/SafeContent';
import { useToastContext } from '@/components/ToastProvider';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Post } from '@/types';
import { postsAPI, uploadAPI, interactionsAPI, usersAPI, nftsAPI, repliesAPI, notificationsAPI, followsAPI } from '@/lib/api';
import { formatRelativeTime } from '@/utils/formatTime';
import { transformPost, transformPostAsync } from '@/utils/transformPost';
import { FeedPostCard } from '@/components/FeedPostCard';
import FeedHeader from '@/components/FeedHeader';
import InlineComposer from '@/components/InlineComposer';
import FeedModals from '@/components/FeedModals';
import { useComposePost } from '@/hooks/useComposePost';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const { token, isAuthenticated } = useWalletAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]); // Initialize empty
  const compose = useComposePost({
    token,
    isAuthenticated,
    connected,
    setPosts,
    showSuccess,
    showError,
  });
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [postToTip, setPostToTip] = useState<Post | null>(null);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [postToReply, setPostToReply] = useState<Post | null>(null);
  const [postInteractions, setPostInteractions] = useState<{[key: string | number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [shoutoutQueue, setShoutoutQueue] = useState<Post[]>([]); // Queue for pending shoutouts
  const activeShoutoutIdRef = useRef<string | number | null>(null); // Track which shoutout is currently active
  const [shoutoutQueueInfo, setShoutoutQueueInfo] = useState<{ activeShoutout: { id: string; duration: number; expiresAt: Date | string; content: string } | null; queuedShoutouts: Array<{ id: string; duration: number; expiresAt: Date | string; content: string }>}>({ activeShoutout: null, queuedShoutouts: [] });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [inlineReplyPostId, setInlineReplyPostId] = useState<string | number | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [isPostingInlineReply, setIsPostingInlineReply] = useState(false);
  const pendingPosts = useRef<Post[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [hideShoutouts, setHideShoutouts] = useState(false);
  const [feedTab, setFeedTab] = useState<'home' | 'following'>('home');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(false);
  const [followingCursor, setFollowingCursor] = useState<string | null>(null);

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

  // Memoize deduplication + shoutout filtering so it only recomputes when posts/hideShoutouts change
  const visiblePosts = useMemo(() => {
    let shoutoutShown = false;
    return Array.from(new Map(posts.map(p => [p.id, p])).values()).filter(post => {
      if (post.isShoutout) {
        if (hideShoutouts || shoutoutShown) return false;
        shoutoutShown = true;
        return true;
      }
      return true;
    });
  }, [posts, hideShoutouts]);

  // Load hide shoutout preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setHideShoutouts(localStorage.getItem('korus-hide-shoutout') === 'true');
      } catch { /* ignore */ }
    }
  }, []);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPosts = response.posts.map((post: any) => transformPost(post));

        // Track new post IDs (backend already resolves NFT avatars)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transformedPosts.forEach((post: any) => addedPostIds.current.add(post.id));

        // Append new posts to existing ones
        setPosts(prev => [...prev, ...transformedPosts as Post[]]);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPosts = response.posts.map((post: any) => transformPost(post));

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

        // Track all post IDs (backend already resolves NFT avatars)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postsWithTimers.forEach((post: any) => addedPostIds.current.add(post.id));

        setPosts(postsWithTimers as Post[]);
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

  // Fetch following feed
  const fetchFollowingPosts = async (loadMore = false) => {
    if (!token) return;
    setIsLoadingFollowing(true);
    try {
      const res = await followsAPI.getFollowingFeed(token, {
        limit: POSTS_PER_PAGE,
        ...(loadMore && followingCursor ? { cursor: followingCursor } : {})
      });
      if (res.posts && res.posts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformed = res.posts.map((post: any) => transformPost(post));
        // Backend already resolves NFT avatars
        if (loadMore) {
          setFollowingPosts(prev => [...prev, ...transformed as Post[]]);
        } else {
          setFollowingPosts(transformed as Post[]);
        }
        setFollowingHasMore(res.pagination.hasMore);
        setFollowingCursor(res.pagination.cursor);
      } else {
        if (!loadMore) setFollowingPosts([]);
        setFollowingHasMore(false);
      }
    } catch (error) {
      logger.error('Failed to fetch following feed:', error);
      if (!loadMore) setFollowingPosts([]);
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  // Initialize posts when component mounts (run once)
  useEffect(() => {
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch following feed when tab changes
  useEffect(() => {
    if (feedTab === 'following' && isAuthenticated && token && followingPosts.length === 0) {
      fetchFollowingPosts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTab, isAuthenticated, token]);

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
        // Join feed room to receive targeted feed events
        socketRef.current?.emit('join_feed');
      });

      socketRef.current.on('disconnect', () => {
        logger.log('❌ WebSocket disconnected');
      });
    } else {
      logger.log('🔌 Reconnecting existing WebSocket');
      socketRef.current.connect();
    }

    // Join feed room (also handles reconnection case)
    if (socketRef.current.connected) {
      socketRef.current.emit('join_feed');
    }

    // Remove any existing 'new_post' listeners to prevent duplicates
    socketRef.current.off('new_post');

    // Listen for new posts (always set up fresh listener)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketRef.current.on('new_post', async (newPost: any) => {
      logger.log('📨 Received new post via WebSocket:', newPost.id);

      const transformedPost = await transformPostAsync(newPost, resolveAvatar);

      // Deduplicate
      const existsInSet = addedPostIds.current.has(transformedPost.id);
      if (existsInSet) {
        logger.log('⚠️ Post already exists in feed, skipping duplicate:', transformedPost.id);
        return;
      }

      addedPostIds.current.add(transformedPost.id);

      // Shoutouts inject directly (time-sensitive)
      if (transformedPost.isShoutout) {
        setPosts(prevPosts => {
          if (prevPosts.some(p => p.id === transformedPost.id)) return prevPosts;
          const hasActiveShoutout = prevPosts.some(p => p.isShoutout);
          if (hasActiveShoutout) {
            setShoutoutQueue(q => {
              if (q.some(s => s.id === transformedPost.id)) return q;
              return [...q, transformedPost as Post];
            });
            return prevPosts;
          }
          return [transformedPost as Post, ...prevPosts];
        });
        return;
      }

      // Regular posts go to pending buffer — show "New posts" banner
      pendingPosts.current = [transformedPost as Post, ...pendingPosts.current];
      setPendingCount(c => c + 1);
      logger.log('✨ Buffered new post:', transformedPost.id, '(pending count:', pendingPosts.current.length, ')');
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
          // Also update nested repostedPost inside repost cards
          if (post.repostedPost && post.repostedPost.id === update.postId) {
            return {
              ...post,
              repostedPost: {
                ...post.repostedPost,
                likes: update.updates.likeCount !== undefined ? update.updates.likeCount : post.repostedPost.likes,
                tips: update.updates.tipAmount !== undefined ? Number(update.updates.tipAmount) : post.repostedPost.tips,
                comments: update.updates.replyCount !== undefined ? update.updates.replyCount : post.repostedPost.comments,
              }
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
        // Leave feed room before disconnecting
        socketRef.current.emit('leave_feed');
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

    // Join user-specific room (with auth token)
    socketRef.current.emit('join_user', { walletAddress, token });

    // Listen for real-time notifications
    socketRef.current.off('new_notification');
    socketRef.current.on('new_notification', () => {
      setNotificationCount(prev => prev + 1);
    });

    return () => {
      socketRef.current?.off('new_notification');
    };
  }, [connected, isAuthenticated, publicKey]);

  // Fetch initial unread notification count on mount (WebSocket handles real-time updates)
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
  }, [connected, isAuthenticated, token]);

  // Fetch user interactions for loaded posts (only for new post IDs, debounced)
  const fetchedInteractionIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!connected || !isAuthenticated || !token || posts.length === 0) return;

    // Only fetch for post IDs we haven't fetched yet
    const newPostIds = posts
      .map(post => String(post.id))
      .filter(id => !fetchedInteractionIds.current.has(id));

    if (newPostIds.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const response = await interactionsAPI.getUserInteractions(newPostIds, token);
        if (response.success) {
          // Mark these IDs as fetched
          newPostIds.forEach(id => fetchedInteractionIds.current.add(id));
          // Merge new interactions with existing ones
          setPostInteractions(prev => ({
            ...prev,
            ...(response.interactions as {[key: string]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}})
          }));
        }
      } catch (error) {
        logger.error('Failed to fetch user interactions:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
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

  // Shoutout confirm handler (extracted for FeedModals)
  const handleShoutoutConfirm = async (duration: number, price: number, transactionSignature: string) => {
    logger.log('=== Home Page ShoutoutModal onConfirm called ===');
    logger.log('Duration:', duration);
    logger.log('Price:', price);
    logger.log('Transaction signature:', transactionSignature);
    logger.log('Token:', !!token);
    logger.log('Content:', compose.composeText);

    try {
      // Upload image if needed
      let imageUrl: string | undefined;
      if (compose.selectedFiles.length > 0 && compose.selectedFiles[0].type.startsWith('image/')) {
        logger.log('Uploading image...');
        try {
          const uploadResponse = await uploadAPI.uploadImage(compose.selectedFiles[0], token!);
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
      if (compose.composeText.trim()) {
        postData.content = compose.composeText.trim();
      }

      // Add image URL if uploaded or GIF if selected
      if (compose.selectedGif) {
        postData.imageUrl = compose.selectedGif;
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
      compose.resetCompose();
      logger.log('=== Home Page Shoutout Post Creation Complete ===');
    } catch (error: unknown) {
      logger.error('=== Failed to create shoutout post ===');
      logger.error('Error:', error);
      logger.error('Error message:', (error as Error)?.message);
      logger.error('Error response:', (error as { response?: unknown })?.response);
      showError((error as Error)?.message || 'Failed to create shoutout post');
    }
  };

  // Inline reply handler
  const submitInlineReply = useCallback(async (post: Post) => {
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
  }, [connected, isAuthenticated, token, inlineReplyText, showError, showSuccess]);

  // Interaction handlers
  const toggleLike = useCallback(async (postId: number | string) => {
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

      // Update post like count optimistically (and nested repostedPost)
      setPosts(prev => prev.map(p => {
        if (String(p.id) === id) {
          return {
            ...p,
            likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1
          };
        }
        if (p.repostedPost && String(p.repostedPost.id) === id) {
          return {
            ...p,
            repostedPost: {
              ...p.repostedPost,
              likes: currentlyLiked ? Math.max(0, (p.repostedPost.likes ?? 0) - 1) : (p.repostedPost.likes ?? 0) + 1
            }
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
        if (p.repostedPost && String(p.repostedPost.id) === id) {
          return {
            ...p,
            repostedPost: {
              ...p.repostedPost,
              likes: currentlyLiked ? (p.repostedPost.likes ?? 0) + 1 : Math.max(0, (p.repostedPost.likes ?? 0) - 1)
            }
          };
        }
        return p;
      }));

      showError('Failed to like post. Please try again.');
    }
  }, [connected, isAuthenticated, token, postInteractions, showError]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const handleRepostResponse = async (postId: number, response: any) => {
    const isCurrentlyReposted = postInteractions[postId]?.reposted;

    if (response.success) {
      if (!isCurrentlyReposted && response.repostPost) {
        // Check if WebSocket already added this repost
        const alreadyExists = posts.some(p => p.id === response.repostPost.id);

        if (!alreadyExists) {
          logger.log('WebSocket hasn\'t added repost yet, adding locally');
          const transformedRepost = await transformPostAsync(response.repostPost, resolveAvatar);
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
  const toggleRepost = useCallback(async (postId: number | string, comment?: string) => {
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
          const transformedRepost = await transformPostAsync(response.repostPost, resolveAvatar);

          // Track the repost ID to prevent WebSocket duplicates
          addedPostIds.current.add(transformedRepost.id);

          // Add to feed at the top (after shoutouts)
          setPosts(prev => {
            if (prev.some(p => p.id === transformedRepost.id)) {
              logger.log('Repost already exists in feed, skipping:', transformedRepost.id);
              return prev;
            }

            logger.log('Adding repost to feed:', transformedRepost.id);
            const firstNonShoutoutIndex = prev.findIndex(p => !p.isShoutout);
            if (firstNonShoutoutIndex === -1) {
              return [...prev, transformedRepost];
            }
            return [
              ...prev.slice(0, firstNonShoutoutIndex),
              transformedRepost,
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

        // Update repost count on the original post AND any repost cards referencing it
        setPosts(prev => prev.map(p => {
          if (String(p.id) === String(postId)) {
            return {
              ...p,
              reposts: !isCurrentlyReposted ? (p.reposts ?? 0) + 1 : Math.max(0, (p.reposts ?? 0) - 1)
            };
          }
          // Also update nested repostedPost inside repost cards
          if (p.repostedPost && String(p.repostedPost.id) === String(postId)) {
            return {
              ...p,
              repostedPost: {
                ...p.repostedPost,
                reposts: !isCurrentlyReposted ? (p.repostedPost.reposts ?? 0) + 1 : Math.max(0, (p.repostedPost.reposts ?? 0) - 1)
              }
            };
          }
          return p;
        }));
      }
    } catch (error) {
      logger.error('Failed to toggle repost:', error);
      showError('Failed to repost. Please try again.');
    }
  }, [posts, publicKey, postInteractions, token, resolveAvatar, showError, showSuccess]);

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

  // Flush pending posts into the feed (called when user clicks "New posts" banner)
  const flushPendingPosts = useCallback(() => {
    if (pendingPosts.current.length === 0) return;
    setPosts(prev => {
      const shoutouts = prev.filter(p => p.isShoutout);
      const regularPosts = prev.filter(p => !p.isShoutout);
      return [...shoutouts, ...pendingPosts.current, ...regularPosts];
    });
    pendingPosts.current = [];
    setPendingCount(0);
  }, []);

  // Stable callbacks for FeedPostCard
  const handleTipClick = useCallback((post: Post) => {
    if (publicKey && (post.wallet === publicKey.toBase58() || post.author?.walletAddress === publicKey.toBase58())) {
      showError("You cannot tip your own posts");
      return;
    }
    setPostToTip(post);
    setShowTipModal(true);
  }, [publicKey, showError]);

  const handleShareClick = useCallback((post: Post) => {
    setPostToShare(post);
    setShowShareModal(true);
  }, []);

  const handleOptionsClick = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowPostOptionsModal(true);
  }, []);

  const handleReplyToggle = useCallback((postId: string | number) => {
    setInlineReplyPostId(prev => {
      if (prev === postId) {
        setInlineReplyText('');
        return null;
      }
      setInlineReplyText('');
      return postId;
    });
  }, []);

  const handleInlineReplyClose = useCallback(() => {
    setInlineReplyPostId(null);
    setInlineReplyText('');
  }, []);

  const handleNavigate = useCallback((postId: string | number) => {
    router.push(`/post/${postId}`);
  }, [router]);


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
            <FeedHeader
              feedTab={feedTab}
              onFeedTabChange={setFeedTab}
              onMobileMenuOpen={() => setShowMobileMenu(true)}
              onSearchOpen={() => setShowSearchModal(true)}
            />

            {/* Compose Post */}
            <InlineComposer
              userAvatar={userAvatar}
              walletPrefix={publicKey?.toBase58().slice(0, 2).toUpperCase()}
              composeText={compose.composeText}
              onComposeTextChange={compose.setComposeText}
              selectedFiles={compose.selectedFiles}
              showDrawCanvas={compose.showDrawCanvas}
              drawingDataUrl={compose.drawingDataUrl}
              showEmojiPicker={compose.showEmojiPicker}
              showGifPicker={compose.showGifPicker}
              isPosting={compose.isPosting}
              onFileSelect={compose.handleFileSelect}
              onRemoveFile={compose.removeFile}
              onEmojiSelect={compose.handleEmojiSelect}
              onGifSelect={(gifUrl) => {
                compose.setSelectedGif(gifUrl);
                compose.setSelectedFiles([]);
              }}
              onDrawingSave={compose.handleDrawingSave}
              onClearDrawing={() => compose.setDrawingDataUrl(null)}
              onToggleDrawCanvas={() => compose.setShowDrawCanvas(!compose.showDrawCanvas)}
              onToggleEmojiPicker={() => compose.setShowEmojiPicker(!compose.showEmojiPicker)}
              onToggleGifPicker={() => compose.setShowGifPicker(!compose.showGifPicker)}
              onShoutoutClick={() => {
                if (compose.composeText.trim() || compose.selectedFiles.length > 0 || compose.drawingDataUrl) {
                  setShowShoutoutModal(true);
                }
              }}
              onPost={compose.handleRegularPost}
              drawingSaveRef={compose.drawingSaveRef}
              onCloseDrawCanvas={() => compose.setShowDrawCanvas(false)}
            />

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

            {/* New Posts Banner */}
            {pendingCount > 0 && feedTab === 'home' && (
              <button
                onClick={flushPendingPosts}
                className="w-full py-3 text-center text-[14px] font-semibold border-b border-[var(--color-border-light)] hover:bg-white/[0.04] transition-colors"
                style={{ color: 'var(--korus-primary)' }}
              >
                Show {pendingCount} new post{pendingCount > 1 ? 's' : ''}
              </button>
            )}

            {/* Feed Posts */}
            <div>
          {feedTab === 'following' ? (
            // Following feed
            isLoadingFollowing ? (
              <FeedSkeleton count={5} />
            ) : followingPosts.length === 0 ? (
              <div className="py-16 text-center text-[var(--color-text-tertiary)]">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-[15px] font-medium mb-1">No posts yet</p>
                <p className="text-[13px]">{isAuthenticated ? 'Follow users to see their posts here' : 'Connect your wallet to use the following feed'}</p>
              </div>
            ) : (
              /* eslint-disable @typescript-eslint/no-explicit-any */
              followingPosts.map((post) => (
                <div key={post.id} className="px-5 py-4 border-b border-[var(--color-border-light)] cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => router.push(`/post/${(post as any).parentPostId || post.repostedPost?.id || post.id}`)}
                >
                  {(post as any).isReply && (post as any).replyingToUser && (
                    <div className="flex items-center gap-2 ml-[52px] mb-1.5 text-[13px] text-[var(--color-text-tertiary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Replying to <Link href={`/profile/${(post as any).parentPostId || ''}`} onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: 'var(--korus-primary)' }}>@{(post as any).replyingToUser}</Link></span>
                    </div>
                  )}
                  {post.repostedBy && (
                    <div className="flex items-center gap-2 ml-[52px] mb-1.5 text-[13px] text-[var(--color-text-tertiary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span><Link href={`/profile/${post.wallet}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{post.repostedBy}</Link> reposted</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex-shrink-0 overflow-hidden">
                      {(post.repostedPost?.avatar || post.avatar) ? (
                        <Image src={(post.repostedPost?.avatar || post.avatar) as string} alt="" width={42} height={42} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-black font-bold text-sm">{((post.repostedPost?.user || post.user) as string)?.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/profile/${post.repostedPost?.wallet || post.wallet}`} onClick={(e) => e.stopPropagation()} className="font-bold text-[15px] text-[var(--color-text)] hover:underline truncate">
                          {post.repostedPost?.user || post.user}
                        </Link>
                        <span className="text-[var(--color-text-tertiary)] text-[13px] flex-shrink-0">{formatRelativeTime((post.repostedPost?.createdAt || post.createdAt) as string)}</span>
                      </div>
                      <div className="text-[15px] text-[var(--color-text)] whitespace-pre-wrap break-words mb-2">
                        <SafeContent content={(post.repostedPost?.content || post.content) as string} />
                      </div>
                      {(post.repostedPost?.image || post.image) && (
                        <div className="mb-3 flex justify-center">
                          <Image src={(post.repostedPost?.image || post.image) as string} alt="" width={600} height={400} className="max-w-full h-auto rounded-xl border border-[var(--color-border-light)]" style={{ maxHeight: '500px', width: 'auto', height: 'auto' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[13px] text-[var(--color-text-tertiary)]">
                        <span>{(post.repostedPost || post).comments ?? 0} replies</span>
                        <span>{(post.repostedPost || post).likes ?? 0} likes</span>
                        <span>{(post.repostedPost || post).reposts ?? 0} reposts</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
              /* eslint-enable @typescript-eslint/no-explicit-any */
            )
          ) : isLoading ? (
            <FeedSkeleton count={5} />
          ) : (
            visiblePosts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                interactions={postInteractions[post.repostedPost?.id || post.id] || postInteractions[post.id]}
                currentWallet={publicKey?.toBase58() || null}
                userAvatar={userAvatar}
                inlineReplyPostId={inlineReplyPostId}
                inlineReplyText={inlineReplyText}
                isPostingInlineReply={isPostingInlineReply}
                onLike={toggleLike}
                onRepost={toggleRepost}
                onTip={handleTipClick}
                onShare={handleShareClick}
                onOptions={handleOptionsClick}
                onReply={handleReplyToggle}
                onInlineReplyChange={setInlineReplyText}
                onInlineReplySubmit={submitInlineReply}
                onInlineReplyClose={handleInlineReplyClose}
                onShoutoutExpire={handleShoutoutExpire}
                onNavigate={handleNavigate}
              />
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
      <FeedModals
        showCreatePostModal={showCreatePostModal}
        onCloseCreatePost={() => setShowCreatePostModal(false)}
        onPostCreate={handlePostCreate}
        effectiveQueueInfo={effectiveQueueInfo}
        showPostOptionsModal={showPostOptionsModal}
        onClosePostOptions={() => setShowPostOptionsModal(false)}
        selectedPost={selectedPost}
        isOwnPost={selectedPost?.wallet === publicKey?.toBase58()}
        onDeletePost={() => {
          if (selectedPost) {
            setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
          }
        }}
        showShoutoutModal={showShoutoutModal}
        onCloseShoutout={() => setShowShoutoutModal(false)}
        shoutoutPostContent={compose.composeText}
        onShoutoutConfirm={handleShoutoutConfirm}
        showTipModal={showTipModal}
        onCloseTip={() => {
          setShowTipModal(false);
          setPostToTip(null);
        }}
        postToTip={postToTip}
        onTipSuccess={(amount: number) => {
          if (postToTip?.id) {
            markTipped(postToTip.id);
            setPosts(prev => prev.map(p => {
              if (p.id === postToTip.id) {
                return { ...p, tips: (p.tips || 0) + amount, tipCount: (p.tipCount || 0) + 1 };
              }
              if (p.repostedPost && String(p.repostedPost.id) === String(postToTip.id)) {
                return { ...p, repostedPost: { ...p.repostedPost, tips: (p.repostedPost.tips || 0) + amount } };
              }
              return p;
            }));
          }
        }}
        showShareModal={showShareModal}
        onCloseShare={() => {
          setShowShareModal(false);
          setPostToShare(null);
        }}
        postToShare={postToShare}
        showReplyModal={showReplyModal}
        onCloseReply={() => {
          setShowReplyModal(false);
          setPostToReply(null);
        }}
        postToReply={postToReply}
        onReplySuccess={(reply) => {
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
          if (postToReply?.id) {
            markReplied(postToReply.id);
          }
        }}
        showSearchModal={showSearchModal}
        onCloseSearch={() => setShowSearchModal(false)}
        allPosts={posts}
        showMobileMenu={showMobileMenu}
        onCloseMobileMenu={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
