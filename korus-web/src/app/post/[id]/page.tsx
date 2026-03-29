'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { SafeContent } from '@/components/SafeContent';
import { formatFullTimestamp } from '@/utils/formatTime';
import { useToast } from '@/hooks/useToast';
import { postsAPI, repliesAPI, uploadAPI, interactionsAPI, usersAPI } from '@/lib/api';
import type { Post, Reply } from '@/types';
import PostDetailModals from '@/components/PostDetailModals';
import PostDetailReplyItem from '@/components/PostDetailReplyItem';
import PostDetailInlineComposer from '@/components/PostDetailInlineComposer';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToast();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username?: string; snsUsername?: string; tier?: string } | null>(null);
  const [liked, setLiked] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string | number>>(new Set());
  const [tippedReplies, setTippedReplies] = useState<Set<string | number>>(new Set());
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyToPost, setReplyToPost] = useState<Post | null>(null);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [inlineReplyContent, setInlineReplyContent] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [postToTip, setPostToTip] = useState<Post | null>(null);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [showReplyOptionsModal, setShowReplyOptionsModal] = useState(false);
  const [selectedReplyForReport, setSelectedReplyForReport] = useState<Reply | null>(null);

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (!address || address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);

      // Try to fetch from backend
      try {
        const response = await postsAPI.getPost(postId);
        logger.log('📝 Raw backend response:', response);

        if (response) {
          // Transform backend post to frontend format
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const backendPost = (response as any).post || response as any;
          logger.log('📝 Backend post before transformation:', backendPost);
          logger.log('📝 Backend post author:', backendPost.author);
          const transformedPost = {
            ...backendPost,
            user: backendPost.author?.snsUsername || backendPost.author?.username || backendPost.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: backendPost.authorWallet,
            userTheme: backendPost.author?.themeColor,
            time: new Date(backendPost.createdAt).toLocaleString(),
            createdAt: backendPost.createdAt,
            likes: backendPost.likeCount || 0,
            comments: backendPost.replyCount || 0,
            replies: backendPost.replyCount || 0,
            reposts: backendPost.repostCount || 0,
            tips: Number(backendPost.tipAmount) || 0,
            tipCount: backendPost.tipCount || 0,
            image: backendPost.imageUrl,
            videoUrl: backendPost.videoUrl,
            avatar: backendPost.author?.nftAvatar || null,
            isPremium: backendPost.author?.tier === 'premium' || backendPost.author?.tier === 'vip' || backendPost.author?.subscriptionStatus === 'active',
            author: backendPost.author,
            // Handle reposts
            isRepost: backendPost.isRepost,
            repostedPost: backendPost.isRepost && backendPost.originalPost ? {
              id: backendPost.originalPost.id,
              user: backendPost.originalPost.author?.snsUsername || backendPost.originalPost.author?.username || backendPost.originalPost.authorWallet?.slice(0, 15) || 'Unknown',
              wallet: backendPost.originalPost.authorWallet,
              userTheme: backendPost.originalPost.author?.themeColor,
              content: backendPost.originalPost.content || '',
              likes: backendPost.originalPost.likeCount || 0,
              replies: backendPost.originalPost.replyCount || 0,
              tips: Number(backendPost.originalPost.tipAmount) || 0,
              comments: backendPost.originalPost.replyCount || 0,
              reposts: backendPost.originalPost.repostCount || 0,
              time: new Date(backendPost.originalPost.createdAt).toLocaleString(),
              createdAt: backendPost.originalPost.createdAt,
              isPremium: backendPost.originalPost.author?.tier === 'premium' || backendPost.originalPost.author?.tier === 'vip',
              image: backendPost.originalPost.imageUrl,
              avatar: backendPost.originalPost.author?.nftAvatar || null,
            } : undefined,
            repostedBy: backendPost.isRepost ? (backendPost.author?.snsUsername || backendPost.author?.username || backendPost.authorWallet?.slice(0, 15)) : undefined,
          };

          logger.log('✅ Transformed post:', transformedPost);
          logger.log('✅ Transformed post.user:', transformedPost.user);
          logger.log('✅ Transformed post.time:', transformedPost.time);

          setPost(transformedPost as Post);

          // Use replies already included in the getSinglePost response (no extra round-trip)
          const inlineReplies = backendPost.replies || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformedReplies = inlineReplies.map((reply: any) => ({
            id: reply.id as unknown,
            postId: postId,
            user: reply.author?.snsUsername || reply.author?.username || reply.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: reply.authorWallet,
            content: reply.content,
            likes: reply.likeCount || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            replies: (reply.childReplies || []).map((child: any) => ({
              id: child.id as unknown,
              postId: postId,
              user: child.author?.snsUsername || child.author?.username || child.authorWallet?.slice(0, 15) || 'Unknown',
              wallet: child.authorWallet,
              content: child.content,
              likes: child.likeCount || 0,
              replies: [],
              time: new Date(child.createdAt).toLocaleString(),
              createdAt: child.createdAt,
              isPremium: child.author?.tier === 'premium' || child.author?.tier === 'vip' || child.author?.subscriptionStatus === 'active',
              image: child.imageUrl,
              videoUrl: child.videoUrl,
              avatar: child.author?.nftAvatar || null,
            })),
            time: new Date(reply.createdAt).toLocaleString(),
            createdAt: reply.createdAt,
            isPremium: reply.author?.tier === 'premium' || reply.author?.tier === 'vip' || reply.author?.subscriptionStatus === 'active',
            image: reply.imageUrl,
            videoUrl: reply.videoUrl,
            avatar: reply.author?.nftAvatar || null,
          }));
          setReplies(transformedReplies as Reply[]);

          // Fetch interactions + profile in parallel (non-blocking for post display)
          if (isAuthenticated && token) {
            // Collect all IDs for a single batch interaction request
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allIds = [postId, ...transformedReplies.map((r: any) => String(r.id))];

            const [interactionsResult, profileResult] = await Promise.allSettled([
              interactionsAPI.getUserInteractions(allIds, token),
              usersAPI.getProfile(token),
            ]);

            // Process interactions (post + replies in one batch)
            if (interactionsResult.status === 'fulfilled' && interactionsResult.value.success) {
              const interactions = interactionsResult.value.interactions;
              if (interactions[postId]) {
                setLiked(interactions[postId].liked);
                setTipped(interactions[postId].tipped);
              }
              const newLikedReplies = new Set<string>();
              const newTippedReplies = new Set<string>();
              for (const r of transformedReplies) {
                const rid = String(r.id);
                if (interactions[rid]?.liked) newLikedReplies.add(rid);
                if (interactions[rid]?.tipped) newTippedReplies.add(rid);
              }
              setLikedReplies(newLikedReplies);
              setTippedReplies(newTippedReplies);
            }

            // Process profile
            if (profileResult.status === 'fulfilled') {
              const profileResponse = profileResult.value;
              if (profileResponse.user) {
                if (profileResponse.user.nftAvatar) {
                  setCurrentUserAvatar(profileResponse.user.nftAvatar);
                }
                setCurrentUserProfile({
                  username: profileResponse.user.username,
                  snsUsername: profileResponse.user.snsUsername,
                  tier: profileResponse.user.tier
                });
              }
            }
          }
        }
      } catch (backendError) {
        logger.error('Backend fetch failed:', backendError);
      }
    } catch (error) {
      logger.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, isAuthenticated, token]);

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
      return;
    }
    loadPost();
  }, [postId, connected, router, loadPost]);

  const handleLike = async () => {
    if (!post || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to like posts');
      return;
    }

    // Optimistic update
    const previousLiked = liked;
    const previousLikes = post.likes;
    setLiked(!liked);
    setPost({
      ...post,
      likes: liked ? post.likes - 1 : post.likes + 1
    });

    try {
      await interactionsAPI.likePost(postId, token);
    } catch (error) {
      logger.error('Failed to like post:', error);
      // Revert on error
      setLiked(previousLiked);
      setPost({
        ...post,
        likes: previousLikes
      });
      showError('Failed to like post. Please try again.');
    }
  };

  const handleLikeReply = async (replyId: number | string) => {
    if (!token) {
      showError('Please connect your wallet to like replies');
      return;
    }

    const replyIdStr = String(replyId);
    const newLikedReplies = new Set(likedReplies);
    const isLiked = likedReplies.has(replyIdStr);
    const previousLikedReplies = new Set(likedReplies);

    if (isLiked) {
      newLikedReplies.delete(replyIdStr);
    } else {
      newLikedReplies.add(replyIdStr);
    }

    setLikedReplies(newLikedReplies);

    // Update likes in nested reply structure
    const updateReplyLikes = (replies: Reply[]): Reply[] => {
      return replies.map(reply => {
        if (reply.id === replyId) {
          return { ...reply, likes: isLiked ? reply.likes - 1 : reply.likes + 1 };
        }
        if (reply.replies.length > 0) {
          return { ...reply, replies: updateReplyLikes(reply.replies) };
        }
        return reply;
      });
    };

    const previousReplies = [...replies];
    setReplies(updateReplyLikes(replies));

    // Call backend API to persist the like
    try {
      await repliesAPI.likeReply(replyIdStr, token);
    } catch (error) {
      logger.error('Failed to like reply:', error);
      // Revert on error
      setLikedReplies(previousLikedReplies);
      setReplies(previousReplies);
      showError('Failed to like reply. Please try again.');
    }
  };

  const toggleReplyExpansion = (replyId: string | number) => {
    const toggleExpansion = (replies: Reply[]): Reply[] => {
      return replies.map(reply => {
        if (reply.id === replyId) {
          return { ...reply, isExpanded: !reply.isExpanded };
        }
        if (reply.replies.length > 0) {
          return { ...reply, replies: toggleExpansion(reply.replies) };
        }
        return reply;
      });
    };

    setReplies(toggleExpansion(replies));
  };

  const handleReply = (post: Post | Reply) => {
    setReplyToPost(post as Post);
    setShowReplyModal(true);
  };

  // Helper function to convert Reply to Post-like object for modals
  const convertReplyToPost = (reply: Reply): Post => {
    return {
      id: reply.id,
      user: reply.user,
      wallet: reply.wallet,
      content: reply.content,
      likes: reply.likes,
      replies: reply.replies?.length || 0,
      tips: 0,
      time: reply.time,
      isPremium: reply.isPremium,
      image: reply.image,
      videoUrl: reply.videoUrl
    } as Post;
  };

  const handleInlineReply = async () => {
    if (!connected || !isAuthenticated || !token) {
      showError('Please connect your wallet and sign in to reply');
      return;
    }

    if (!inlineReplyContent.trim()) {
      showError('Please write your reply');
      return;
    }

    if (inlineReplyContent.length > 300) {
      showError('Reply is too long. Maximum 300 characters.');
      return;
    }

    setIsPostingReply(true);

    try {
      // Upload image if present
      let imageUrl: string | undefined;
      if (selectedGif) {
        imageUrl = selectedGif;
      } else if (selectedFiles.length > 0) {
        const imageFile = selectedFiles[0];
        if (imageFile.type.startsWith('image/')) {
          logger.log('Uploading reply image...');
          const uploadResponse = await uploadAPI.uploadImage(imageFile, token);
          imageUrl = uploadResponse.url;
          logger.log('Reply image uploaded:', imageUrl);
        }
      }

      // Create reply via backend API
      await repliesAPI.createReply(
        postId,
        {
          content: inlineReplyContent.trim(),
          imageUrl
        },
        token
      );

      showSuccess('Reply posted successfully!');
      setInlineReplyContent('');
      setSelectedFiles([]);
      setSelectedGif(null);

      // Reload post to get latest data from backend
      await loadPost();
    } catch (error) {
      logger.error('Failed to post reply:', error);
      showError('Failed to post reply. Please try again.');
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 4));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    setInlineReplyContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Wrapper callbacks for reply tip/share - convert Reply to Post for modals
  const handleTipReply = useCallback((reply: Reply) => {
    setPostToTip(convertReplyToPost(reply));
    setShowTipModal(true);
  }, []);

  const handleShareReply = useCallback((reply: Reply) => {
    setPostToShare(convertReplyToPost(reply));
    setShowShareModal(true);
  }, []);

  const handleReportReply = useCallback((reply: Reply) => {
    setSelectedReplyForReport(reply);
    setShowReplyOptionsModal(true);
  }, []);

  if (!connected) {
    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 bg-[var(--color-background)]" />
        <div className="relative z-10">
          <div className="flex min-h-screen max-w-[1280px] mx-auto">
            <LeftSidebar />
            <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">
              {/* Header skeleton */}
              <div className="sticky top-0 z-10 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-4 px-5 py-3">
                  <button onClick={() => router.back()} className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[var(--color-text)] hover:bg-white/[0.06] transition-colors duration-150">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <span className="text-[18px] font-[800] tracking-[-0.3px] text-[var(--color-text)]">Post</span>
                </div>
              </div>
              {/* Post skeleton */}
              <div className="px-4 py-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-4 w-24 bg-white/[0.06] rounded" />
                      <div className="h-4 w-16 bg-white/[0.06] rounded" />
                    </div>
                    <div className="h-5 w-full bg-white/[0.06] rounded mb-2" />
                    <div className="h-5 w-3/4 bg-white/[0.06] rounded mb-4" />
                    <div className="h-3 w-32 bg-white/[0.06] rounded mt-3.5" />
                    <div className="flex gap-5 py-3.5 mt-3.5 border-t border-[var(--color-border-light)] border-b border-[var(--color-border-light)]">
                      <div className="h-4 w-16 bg-white/[0.06] rounded" />
                      <div className="h-4 w-12 bg-white/[0.06] rounded" />
                      <div className="h-4 w-16 bg-white/[0.06] rounded" />
                      <div className="h-4 w-20 bg-white/[0.06] rounded" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Reply composer skeleton */}
              <div className="px-4 py-3 border-b border-[var(--color-border-light)]">
                <div className="h-10 w-full bg-white/[0.06] rounded-lg mb-4" />
              </div>
              {/* Reply skeletons */}
              {[1, 2].map(i => (
                <div key={i} className="px-4 py-3 animate-pulse border-b border-[var(--color-border-light)]">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
                    <div className="flex-1">
                      <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
                      <div className="h-3 w-full bg-white/[0.06] rounded mb-1" />
                      <div className="h-3 w-1/2 bg-white/[0.06] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <RightSidebar />
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
        </div>
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/6 to-korus-secondary/4 rounded-full blur-[80px]" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/4 to-korus-primary/6 rounded-full blur-[70px]" />
        </div>
        <div className="relative z-10">
          <div className="flex min-h-screen max-w-[1280px] mx-auto">
            <LeftSidebar onSearchClick={() => setShowSearchModal(true)} />
            <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">
              <div className="sticky top-0 z-10 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-4 px-5 py-3">
                  <button onClick={() => router.back()} className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[var(--color-text)] hover:bg-white/[0.06] transition-colors duration-150">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <span className="text-[18px] font-[800] tracking-[-0.3px] text-[var(--color-text)]">Post</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Post not found</h2>
                <p className="text-[var(--color-text-tertiary)] text-center mb-6 max-w-sm">
                  This post doesn&apos;t exist or has been removed.
                </p>
                <Link
                  href="/"
                  className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150"
                >
                  Back to Home
                </Link>
              </div>
            </div>
            <RightSidebar />
          </div>
        </div>
      </main>
    );
  }

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
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onSearchClick={() => setShowSearchModal(true)}
          />
          {/* Main Content */}
          <div className="flex-1 min-w-0 border-r border-[var(--color-border-light)]">

            {/* Header Navigation */}
            <div className="sticky top-0 z-10 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)]">
              <div className="flex items-center gap-4 px-5 py-3">
                {/* Back button */}
                <button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[var(--color-text)] hover:bg-white/[0.06] transition-colors duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>

                <h1 className="text-[18px] font-[800] tracking-[-0.3px] text-[var(--color-text)]">Post</h1>

                <div className="ml-auto flex items-center">
                  {/* Mobile search */}
                  <button
                    onClick={() => setShowSearchModal(true)}
                    aria-label="Open search"
                    className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text)] hover:bg-white/[0.06] transition-colors duration-150"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Post - Exact same styling as homepage */}
            <div className={`${
              post.isShoutout
                ? 'shoutout-post border-2 border-korus-primary bg-korus-primary/5 shadow-[0_4px_12px_rgba(var(--korus-primary-rgb),0.3)]'
                : ''
            }`}>
              {/* Shoutout Banner */}
              {post.isShoutout && (
                <div className="bg-gradient-to-r from-korus-primary to-korus-secondary px-5 py-4 flex items-center justify-center gap-3">
                  <span className="text-black text-2xl">📢</span>
                  <span className="text-black font-black text-2xl tracking-[4px]">SHOUTOUT</span>
                  <div className="flex gap-1">
                    <span className="text-black text-lg">⭐</span>
                    <span className="text-black text-lg">⭐</span>
                    <span className="text-black text-lg">⭐</span>
                  </div>
                </div>
              )}

              <div className="p-5">
                {/* Author header */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {post.avatar ? (
                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                      <Image
                        src={post.avatar}
                        alt={`${post.user} avatar`}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-sm font-bold text-black flex-shrink-0">
                      {post.user.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Name / Handle */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/profile/${post.wallet || post.user}`}
                        className={`font-bold text-[15px] hover:underline cursor-pointer ${post.isShoutout ? 'text-korus-primary' : 'text-[var(--color-text)]'}`}
                      >
                        {truncateAddress(post.user)}
                      </Link>

                      {/* Premium Badge */}
                      {post.isPremium && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                          <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                            <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-[var(--color-text-secondary)]">@{truncateAddress(post.user)}</span>
                  </div>

                  {/* More button */}
                  <div className="ml-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(post);
                        setShowPostOptionsModal(true);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/[0.06] transition-colors duration-150"
                      aria-label="Post options"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Post Text */}
                <SafeContent
                  content={post.content}
                  className="text-[var(--color-text)] text-[17px] leading-[1.6] mt-3 whitespace-pre-wrap break-words"
                  allowLinks={true}
                  allowFormatting={true}
                />

                {/* Post Image */}
                {post.image && (
                  <div className="mt-3.5 flex justify-center">
                    <Image
                      src={post.image}
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

                {/* Full Timestamp */}
                <p className="text-sm text-[var(--color-text-tertiary)] mt-3.5">
                  {formatFullTimestamp(post.createdAt || post.time)}
                </p>

                {/* Stats Row */}
                <div className="flex gap-5 py-[14px] mt-[14px] border-t border-[var(--color-border-light)] border-b border-[var(--color-border-light)]">
                  <span className="text-sm text-[var(--color-text-secondary)]"><span className="text-[var(--color-text)] font-bold">{post.comments}</span> Replies</span>
                  <span className="text-sm text-[var(--color-text-secondary)]"><span className="text-[var(--color-text)] font-bold">{post.likes}</span> Likes</span>
                  <span className="text-sm text-[var(--color-text-secondary)]"><span className="text-[var(--color-text)] font-bold">{post.reposts ?? 0}</span> Reposts</span>
                  <span className="text-sm text-[var(--color-text-secondary)]"><span className="text-[var(--color-text)] font-bold">{post.tips}</span> SOL tipped</span>
                </div>

                {/* Post Actions */}
                <div className="flex justify-around py-2 border-b border-[var(--color-border-light)]">
                  <button
                    onClick={() => handleReply(post)}
                    aria-label="Reply to post"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-[13px] font-medium">{post.comments}</span>
                  </button>

                  <button
                    onClick={handleLike}
                    aria-label={liked ? "Unlike post" : "Like post"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 hover:bg-red-500/10"
                    style={{ color: liked ? '#ef4444' : '#a1a1a1' }}
                  >
                    <svg className="w-[18px] h-[18px]" fill={liked ? '#ef4444' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    <span className="text-[13px] font-medium">{post.likes}</span>
                  </button>

                  <button
                    onClick={() => {
                      setPostToTip(post);
                      setShowTipModal(true);
                    }}
                    aria-label={`Send tip (${post.tips} SOL)`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                      tipped
                        ? 'text-amber-400 hover:bg-amber-500/10'
                        : 'text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    <span className="text-[13px] font-medium">$</span>
                    <span className="text-[13px] font-medium">{post.tips} SOL</span>
                  </button>

                  <button
                    onClick={() => {
                      setPostToShare(post);
                      setShowShareModal(true);
                    }}
                    aria-label="Share post"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Reply Composer */}
            <PostDetailInlineComposer
              currentUserAvatar={currentUserAvatar}
              walletPrefix={publicKey?.toBase58().slice(0, 2).toUpperCase()}
              replyContent={inlineReplyContent}
              onReplyContentChange={setInlineReplyContent}
              selectedFiles={selectedFiles}
              selectedGif={selectedGif}
              isPostingReply={isPostingReply}
              connected={connected}
              onFileSelect={handleFileSelect}
              onRemoveFile={removeFile}
              onClearGif={() => setSelectedGif(null)}
              onToggleGifPicker={() => setShowGifPicker(!showGifPicker)}
              onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
              showGifPicker={showGifPicker}
              showEmojiPicker={showEmojiPicker}
              onSubmitReply={handleInlineReply}
            />

            {/* Replies Section */}
            <div>
              {replies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[var(--color-text-tertiary)]">No replies yet. Be the first to reply!</p>
                </div>
              ) : (
                replies.map(reply => (
                  <PostDetailReplyItem
                    key={reply.id}
                    reply={reply}
                    likedReplies={likedReplies}
                    tippedReplies={tippedReplies}
                    onReply={handleReply}
                    onLikeReply={handleLikeReply}
                    onTipReply={handleTipReply}
                    onShareReply={handleShareReply}
                    onReportReply={handleReportReply}
                    onToggleExpansion={toggleReplyExpansion}
                  />
                ))
              )}
            </div>
          </div>
          <RightSidebar />
        </div>
      </div>

      <PostDetailModals
        showReplyModal={showReplyModal}
        onCloseReply={() => {
          setShowReplyModal(false);
          setReplyToPost(null);
        }}
        replyToPost={replyToPost}
        onReplySuccess={() => {
          loadPost();
        }}
        showPostOptionsModal={showPostOptionsModal}
        onClosePostOptions={() => {
          setShowPostOptionsModal(false);
          setSelectedPost(null);
        }}
        selectedPost={selectedPost}
        isOwnPost={selectedPost?.user === publicKey?.toBase58()}
        showReplyOptionsModal={showReplyOptionsModal}
        onCloseReplyOptions={() => {
          setShowReplyOptionsModal(false);
          setSelectedReplyForReport(null);
        }}
        selectedReplyForReport={selectedReplyForReport}
        isOwnReply={selectedReplyForReport?.user === publicKey?.toBase58()}
        showSearchModal={showSearchModal}
        onCloseSearch={() => setShowSearchModal(false)}
        showMobileMenu={showMobileMenu}
        onCloseMobileMenu={() => setShowMobileMenu(false)}
        showTipModal={showTipModal}
        onCloseTip={() => {
          setShowTipModal(false);
          setPostToTip(null);
        }}
        postToTip={postToTip}
        onTipSuccess={() => {
          // Check if this is the main post or a reply
          if (postToTip?.id === post?.id) {
            setTipped(true);
          } else if (postToTip?.id) {
            // It's a reply, add to tipped replies set
            setTippedReplies(prev => new Set([...prev, String(postToTip.id)]));
          }
        }}
        showShareModal={showShareModal}
        onCloseShare={() => {
          setShowShareModal(false);
          setPostToShare(null);
        }}
        postToShare={postToShare}
        showEmojiPicker={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onCloseEmojiPicker={() => setShowEmojiPicker(false)}
        showGifPicker={showGifPicker}
        onGifSelect={(gifUrl) => {
          setSelectedGif(gifUrl);
          setSelectedFiles([]);
        }}
        onCloseGifPicker={() => setShowGifPicker(false)}
      />
    </main>
  );
}