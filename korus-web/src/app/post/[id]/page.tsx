'use client';
import { logger } from '@/utils/logger';
import Image from 'next/image';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import ReplyModal from '@/components/ReplyModal';
import PostOptionsModal from '@/components/PostOptionsModal';
import { SafeContent } from '@/components/SafeContent';
import { formatRelativeTime, formatFullTimestamp } from '@/utils/formatTime';
import { useToast } from '@/hooks/useToast';
import { postsAPI, repliesAPI, uploadAPI, interactionsAPI, usersAPI } from '@/lib/api';
import type { Post, Reply } from '@/types';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });

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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [postToTip, setPostToTip] = useState<Post | null>(null);
  const [postToShare, setPostToShare] = useState<Post | null>(null);

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
            isPremium: backendPost.author?.tier === 'premium' || backendPost.author?.subscriptionStatus === 'active',
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
              isPremium: backendPost.originalPost.author?.tier === 'premium',
              image: backendPost.originalPost.imageUrl,
              avatar: backendPost.originalPost.author?.nftAvatar || null,
            } : undefined,
            repostedBy: backendPost.isRepost ? (backendPost.author?.snsUsername || backendPost.author?.username || backendPost.authorWallet?.slice(0, 15)) : undefined,
          };

          logger.log('✅ Transformed post:', transformedPost);
          logger.log('✅ Transformed post.user:', transformedPost.user);
          logger.log('✅ Transformed post.time:', transformedPost.time);

          setPost(transformedPost as Post);

          // Fetch user's like status if authenticated
          if (isAuthenticated && token) {
            try {
              const interactionsResponse = await interactionsAPI.getUserInteractions([postId], token);
              if (interactionsResponse.success && interactionsResponse.interactions[postId]) {
                setLiked(interactionsResponse.interactions[postId].liked);
                setTipped(interactionsResponse.interactions[postId].tipped);
              }
            } catch (error) {
              logger.error('Failed to fetch user interactions:', error);
            }

            // Fetch current user's profile
            try {
              const profileResponse = await usersAPI.getProfile(token);
              logger.log('Profile API response:', profileResponse);
              logger.log('NFT Avatar from API:', profileResponse.user?.nftAvatar);
              if (profileResponse.user) {
                if (profileResponse.user.nftAvatar) {
                  setCurrentUserAvatar(profileResponse.user.nftAvatar);
                  logger.log('Set currentUserAvatar to:', profileResponse.user.nftAvatar);
                }
                setCurrentUserProfile({
                  username: profileResponse.user.username,
                  snsUsername: profileResponse.user.snsUsername,
                  tier: profileResponse.user.tier
                });
                logger.log('Set currentUserProfile to:', {
                  username: profileResponse.user.username,
                  snsUsername: profileResponse.user.snsUsername,
                  tier: profileResponse.user.tier
                });
              }
            } catch (error) {
              logger.error('Failed to fetch user profile:', error);
            }
          }

          // Fetch replies
          const repliesResponse = await repliesAPI.getReplies(postId);
          if (repliesResponse.success) {
            logger.log('Raw replies from backend:', repliesResponse.replies);
            // Transform replies to frontend format
            const transformedReplies = repliesResponse.replies.map(reply => {
              const transformed = {
                id: reply.id as unknown,
                postId: postId,
                user: reply.author?.snsUsername || reply.author?.username || reply.authorWallet?.slice(0, 15) || 'Unknown',
                wallet: reply.authorWallet,
                content: reply.content,
                likes: reply.likeCount || 0,
                replies: reply.childReplies?.map(child => ({
                  id: child.id as unknown,
                  postId: postId,
                  user: child.author?.snsUsername || child.author?.username || child.authorWallet?.slice(0, 15) || 'Unknown',
                  wallet: child.authorWallet,
                  content: child.content,
                  likes: child.likeCount || 0,
                  replies: [],
                  time: new Date(child.createdAt).toLocaleString(),
                  createdAt: child.createdAt,
                  isPremium: child.author?.tier === 'premium' || child.author?.subscriptionStatus === 'active',
                  image: child.imageUrl,
                  videoUrl: child.videoUrl,
                  avatar: child.author?.nftAvatar || null,
                })) || [],
                time: new Date(reply.createdAt).toLocaleString(),
                createdAt: reply.createdAt,
                isPremium: reply.author?.tier === 'premium' || reply.author?.subscriptionStatus === 'active',
                image: reply.imageUrl,
                videoUrl: reply.videoUrl,
                avatar: reply.author?.nftAvatar || null,
              };
              logger.log('Transformed reply:', transformed);
              return transformed;
            });
            logger.log('Setting transformed replies:', transformedReplies);
            setReplies(transformedReplies as Reply[]);

            // Fetch liked and tipped status for all replies if authenticated
            if (isAuthenticated && token && transformedReplies.length > 0) {
              try {
                const replyIds = transformedReplies.map(r => String(r.id));
                const likedRepliesResponse = await interactionsAPI.getUserInteractions(replyIds, token);
                if (likedRepliesResponse.success) {
                  const newLikedReplies = new Set<string>();
                  const newTippedReplies = new Set<string>();
                  Object.entries(likedRepliesResponse.interactions).forEach(([replyId, interaction]) => {
                    if (interaction.liked) {
                      newLikedReplies.add(replyId);
                    }
                    if (interaction.tipped) {
                      newTippedReplies.add(replyId);
                    }
                  });
                  setLikedReplies(newLikedReplies);
                  setTippedReplies(newTippedReplies);
                  logger.log('Loaded liked replies:', Array.from(newLikedReplies));
                  logger.log('Loaded tipped replies:', Array.from(newTippedReplies));
                }
              } catch (error) {
                logger.error('Failed to fetch reply interactions:', error);
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
      if (selectedFiles.length > 0) {
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

  const renderReply = (reply: Reply, level: number = 0) => {
    const hasReplies = reply.replies && reply.replies.length > 0;

    return (
      <div key={reply.id}>
        {/* Reply Content */}
        <div className="px-4 py-3 border-b border-white/10 flex gap-3 hover:bg-white/[0.04] transition-colors duration-150">
          {/* Avatar */}
          {reply.avatar ? (
            <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
              <Image
                src={reply.avatar}
                alt={`${reply.user} avatar`}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
              {reply.user.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Reply Body */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <Link
                href={`/profile/${reply.wallet || reply.user}`}
                className="font-semibold text-sm text-[#fafafa] hover:underline"
              >
                {truncateAddress(reply.user)}
              </Link>
              {reply.isPremium && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                  <svg className="w-2.5 h-2.5" fill="black" viewBox="0 0 24 24">
                    <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                  </svg>
                </div>
              )}
              <span className="text-[13px] text-[#a1a1a1]">@{truncateAddress(reply.user)}</span>
              <span className="text-[#737373]">·</span>
              <span className="text-[13px] text-[#737373]">{reply.createdAt ? formatRelativeTime(reply.createdAt) : reply.time}</span>
            </div>

            {/* Content */}
            <SafeContent
              content={reply.content}
              className="text-[#fafafa] text-sm leading-[1.5] mb-2 whitespace-pre-wrap break-words"
              allowLinks={true}
              allowFormatting={true}
            />

            {/* Actions */}
            <div className="flex items-center gap-0.5 mt-2 -ml-2">
              <button
                onClick={() => handleReply(reply)}
                aria-label="Reply to comment"
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[#a1a1a1] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                {hasReplies && <span className="text-xs font-medium">{reply.replies.length}</span>}
              </button>

              <button
                onClick={() => handleLikeReply(reply.id)}
                aria-label={likedReplies.has(reply.id) ? "Unlike reply" : "Like reply"}
                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150 ${
                  likedReplies.has(reply.id)
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-[#a1a1a1] hover:text-red-400 hover:bg-red-500/10'
                }`}
              >
                <svg className="w-4 h-4" fill={likedReplies.has(reply.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
                <span className="text-xs font-medium">{reply.likes}</span>
              </button>

              <button
                onClick={() => {
                  setPostToTip(convertReplyToPost(reply));
                  setShowTipModal(true);
                }}
                aria-label="Send tip (0 SOL)"
                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150 ${
                  tippedReplies.has(String(reply.id))
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-[#a1a1a1] hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <span className="text-xs font-medium">$</span>
                <span className="text-xs font-medium">0 SOL</span>
              </button>

              <button
                onClick={() => {
                  setPostToShare(convertReplyToPost(reply));
                  setShowShareModal(true);
                }}
                aria-label="Share reply"
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[#a1a1a1] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
              </button>
            </div>

            {/* Show replies toggle */}
            {hasReplies && (
              <button
                onClick={() => toggleReplyExpansion(reply.id)}
                className="mt-2 text-korus-primary hover:underline text-[13px]"
              >
                {reply.isExpanded
                  ? `Hide ${reply.replies.length} ${reply.replies.length === 1 ? 'reply' : 'replies'}`
                  : `Show ${reply.replies.length} ${reply.replies.length === 1 ? 'reply' : 'replies'}`
                }
              </button>
            )}
          </div>
        </div>

        {/* Nested Replies */}
        {hasReplies && reply.isExpanded && (
          <div className="ml-8">
            {reply.replies.map(nestedReply => renderReply(nestedReply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!connected) {
    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 bg-[#0a0a0a]" />
        <div className="relative z-10">
          <div className="flex min-h-screen">
            <div className="flex-1 ml-[260px] mr-[320px] max-w-[640px] border-x border-white/10 xl:ml-[260px] xl:mr-[320px] lg:ml-[240px] lg:mr-[300px] md:ml-[200px] md:mr-0 sm:ml-0 sm:mr-0 max-sm:border-x-0">
              {/* Header skeleton */}
              <div className="sticky top-0 z-10 bg-[#0a0a0a]/85 backdrop-blur-[16px] border-b border-white/10">
                <div className="flex items-center gap-4 px-5 py-3">
                  <button onClick={() => router.back()} className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#fafafa] hover:bg-white/[0.06] transition-colors duration-150">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <span className="text-[18px] font-[800] tracking-[-0.3px] text-[#fafafa]">Post</span>
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
                    <div className="flex gap-5 py-3.5 mt-3.5 border-t border-white/10 border-b border-white/10">
                      <div className="h-4 w-16 bg-white/[0.06] rounded" />
                      <div className="h-4 w-12 bg-white/[0.06] rounded" />
                      <div className="h-4 w-16 bg-white/[0.06] rounded" />
                      <div className="h-4 w-20 bg-white/[0.06] rounded" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Reply composer skeleton */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="h-10 w-full bg-white/[0.06] rounded-lg mb-4" />
              </div>
              {/* Reply skeletons */}
              {[1, 2].map(i => (
                <div key={i} className="px-4 py-3 animate-pulse border-b border-white/10">
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
          </div>
        </div>
        <LeftSidebar />
        <RightSidebar />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 bg-[#0a0a0a]" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-[#fafafa]">Post Not Found</h2>
            <p className="text-[#737373] mb-8">The post you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/"
              className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-150 hover:scale-[1.02]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0a0a0a]" />

      {/* Content wrapper */}
      <div className="relative z-10">
        <div className="flex min-h-screen">
          {/* Main Content */}
          <div className="flex-1 ml-[260px] mr-[320px] max-w-[640px] border-x border-white/10 xl:ml-[260px] xl:mr-[320px] lg:ml-[240px] lg:mr-[300px] md:ml-[200px] md:mr-0 sm:ml-0 sm:mr-0 max-sm:border-x-0">

            {/* Header Navigation */}
            <div className="sticky top-0 z-10 bg-[#0a0a0a]/85 backdrop-blur-[16px] border-b border-white/10">
              <div className="flex items-center gap-4 px-5 py-3">
                {/* Back button */}
                <button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#fafafa] hover:bg-white/[0.06] transition-colors duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>

                <h1 className="text-[18px] font-[800] tracking-[-0.3px] text-[#fafafa]">Post</h1>

                <div className="ml-auto flex items-center">
                  {/* Mobile search */}
                  <button
                    onClick={() => setShowSearchModal(true)}
                    aria-label="Open search"
                    className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-[#fafafa] hover:bg-white/[0.06] transition-colors duration-150"
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
                        className={`font-bold text-[15px] hover:underline cursor-pointer ${post.isShoutout ? 'text-korus-primary' : 'text-[#fafafa]'}`}
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
                    <span className="text-sm text-[#a1a1a1]">@{truncateAddress(post.user)}</span>
                  </div>

                  {/* More button */}
                  <div className="ml-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(post);
                        setShowPostOptionsModal(true);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[#a1a1a1] hover:text-[#fafafa] hover:bg-white/[0.06] transition-colors duration-150"
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
                  className="text-[#fafafa] text-[17px] leading-[1.6] mt-3 whitespace-pre-wrap break-words"
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
                      className="max-w-full h-auto rounded-xl border border-white/10"
                      style={{ maxHeight: '500px', width: 'auto', height: 'auto' }}
                      onError={(e) => {
                        // Hide broken image on error
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Full Timestamp */}
                <p className="text-sm text-[#737373] mt-3.5">
                  {formatFullTimestamp(post.createdAt || post.time)}
                </p>

                {/* Stats Row */}
                <div className="flex gap-5 py-[14px] mt-[14px] border-t border-white/10 border-b border-white/10">
                  <span className="text-sm text-[#a1a1a1]"><span className="text-[#fafafa] font-bold">{post.comments}</span> Replies</span>
                  <span className="text-sm text-[#a1a1a1]"><span className="text-[#fafafa] font-bold">{post.likes}</span> Likes</span>
                  <span className="text-sm text-[#a1a1a1]"><span className="text-[#fafafa] font-bold">{post.reposts ?? 0}</span> Reposts</span>
                  <span className="text-sm text-[#a1a1a1]"><span className="text-[#fafafa] font-bold">{post.tips}</span> SOL tipped</span>
                </div>

                {/* Post Actions */}
                <div className="flex justify-around py-2 border-b border-white/10">
                  <button
                    onClick={() => handleReply(post)}
                    aria-label="Reply to post"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[#a1a1a1] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-[13px] font-medium">{post.comments}</span>
                  </button>

                  <button
                    onClick={handleLike}
                    aria-label={liked ? "Unlike post" : "Like post"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                      liked
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-[#a1a1a1] hover:text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    <svg className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
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
                        : 'text-[#a1a1a1] hover:text-amber-400 hover:bg-amber-500/10'
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[#a1a1a1] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Reply Composer */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex gap-3">
                {/* Avatar */}
                {currentUserAvatar ? (
                  <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUserAvatar}
                      alt="Your avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        logger.error('Failed to load avatar image:', currentUserAvatar);
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        logger.log('✅ Avatar image loaded successfully:', currentUserAvatar);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold text-sm">
                      {publicKey?.toBase58().slice(0, 2).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}

                {/* Reply Input Area */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={inlineReplyContent}
                    onChange={(e) => setInlineReplyContent(e.target.value)}
                    placeholder="Post your reply"
                    className="bg-white/[0.06] border border-white/15 rounded-lg text-[#fafafa] text-[15px] placeholder-[#737373] resize-none min-h-[28px] max-h-[300px] outline-none w-full px-3 py-2 focus:border-white/25 transition-colors duration-150"
                    rows={1}
                  />

                  {/* File Previews */}
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          {file.type.startsWith('image/') ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt="Upload preview"
                              width={200}
                              height={128}
                              className="max-w-full h-auto rounded-xl border border-white/10"
                            />
                          ) : (
                            <div className="w-full h-32 bg-white/[0.06] border border-white/15 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-8 h-8 mx-auto mb-2 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-xs text-[#737373] truncate px-2">{file.name}</p>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => removeFile(index)}
                            aria-label="Remove file"
                            className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-[#fafafa] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tools row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      {/* Media Upload */}
                      <label className="w-9 h-9 rounded-lg flex items-center justify-center text-korus-primary/60 hover:text-korus-primary hover:bg-korus-primary/10 transition-all duration-150 cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        aria-label="Add GIF"
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                          showGifPicker
                            ? 'text-korus-primary bg-korus-primary/10'
                            : 'text-korus-primary/60 hover:text-korus-primary hover:bg-korus-primary/10'
                        }`}
                      >
                        <span className="text-xs font-bold">GIF</span>
                      </button>

                      {/* Emoji Button */}
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        aria-label="Add emoji"
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                          showEmojiPicker
                            ? 'text-korus-primary bg-korus-primary/10'
                            : 'text-korus-primary/60 hover:text-korus-primary hover:bg-korus-primary/10'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Character Counter - only show when typing */}
                      {inlineReplyContent.length > 0 && (
                        <div className={`text-xs font-medium ${
                          inlineReplyContent.length > 280
                            ? 'text-red-400'
                            : inlineReplyContent.length > 224
                            ? 'text-yellow-400'
                            : 'text-[#737373]'
                        }`}>
                          {inlineReplyContent.length > 280 && `-${inlineReplyContent.length - 280}`}
                          {inlineReplyContent.length <= 280 && `${280 - inlineReplyContent.length}`}
                        </div>
                      )}

                      {/* Reply Button */}
                      <button
                        onClick={handleInlineReply}
                        disabled={!inlineReplyContent.trim() || inlineReplyContent.length > 280 || isPostingReply || !connected}
                        className={`px-5 py-2 rounded-[20px] text-sm font-semibold transition-all duration-150 ${
                          !inlineReplyContent.trim() || inlineReplyContent.length > 280 || isPostingReply || !connected
                            ? 'bg-korus-primary/20 text-korus-primary/40 cursor-not-allowed'
                            : 'bg-korus-primary text-black hover:opacity-90'
                        }`}
                      >
                        {isPostingReply ? 'Posting...' : !connected ? 'Connect' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies Section */}
            <div>
              {replies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#737373]">No replies yet. Be the first to reply!</p>
                </div>
              ) : (
                replies.map(reply => renderReply(reply))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      <ReplyModal
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setReplyToPost(null);
        }}
        post={replyToPost}
        onReplySuccess={() => {
          // Reload all data from backend to get the latest
          loadPost();
        }}
      />

      {/* Post Options Modal */}
      <PostOptionsModal
        isOpen={showPostOptionsModal}
        onClose={() => {
          setShowPostOptionsModal(false);
          setSelectedPost(null);
        }}
        postId={selectedPost?.id || 0}
        postUser={selectedPost?.user || ''}
        isOwnPost={selectedPost?.user === publicKey?.toBase58()}
      />

      <LeftSidebar />
      <RightSidebar />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={[]}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />

      {/* Tip Modal */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => {
          setShowTipModal(false);
          setPostToTip(null);
        }}
        recipientUser={postToTip?.user || ''}
        postId={postToTip?.id}
        onTipSuccess={() => {
          // Check if this is the main post or a reply
          if (postToTip?.id === post?.id) {
            setTipped(true);
          } else if (postToTip?.id) {
            // It's a reply, add to tipped replies set
            setTippedReplies(prev => new Set([...prev, String(postToTip.id)]));
          }
        }}
      />

      {/* Share Modal */}
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

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-[#171717] backdrop-blur-md rounded-2xl max-w-md w-full max-h-[80vh] border border-white/10 shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-[#fafafa]">Choose Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                aria-label="Close emoji picker"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/15 text-[#a1a1a1] hover:bg-white/[0.12] hover:text-[#fafafa] transition-all duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-8 gap-2">
                {['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '🤔', '😎', '😢', '😭', '😡', '🤯', '🥳', '😴', '🤤',
                  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👋', '🤚', '🖐️', '✋', '👏', '🙌', '🤝', '🙏', '✊',
                  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
                  '🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '✨', '🎯', '🎪', '🎨', '🎭', '🎬', '🎮', '🎵', '🎶',
                  '🔥', '💯', '💫', '⭐', '🌟', '⚡', '💥', '💨', '🌈', '☀️', '🌙', '⭐', '🌊', '🌍', '🌎', '🌏',
                  '💰', '💸', '💵', '💎', '🚀', '📈', '📉', '💹', '🏦', '💳', '⚖️', '🎯', '✅', '❌', '⚠️', '💯',
                  '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🍳', '🧀', '🥞', '🧇', '🍞', '🥖', '🥨', '🥯', '🥐',
                  '☕', '🍵', '🧃', '🥤', '🍻', '🍷', '🥂', '🍾', '🍸', '🍹', '🍺', '🥃', '🥛', '🧋', '🧊', '🍯'].map((emoji, index) => (
                  <button
                    key={`emoji-${index}-${emoji}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    aria-label={`Insert ${emoji}`}
                    className="w-10 h-10 text-xl hover:bg-white/[0.12] rounded-lg transition-colors flex items-center justify-center hover:scale-110 transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGifPicker(false)}>
          <div className="bg-[#171717] backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[80vh] border border-white/10 shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-[#fafafa]">Choose GIF</h3>
              <button
                onClick={() => setShowGifPicker(false)}
                aria-label="Close GIF picker"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/15 text-[#a1a1a1] hover:bg-white/[0.12] hover:text-[#fafafa] transition-all duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-[#fafafa] text-lg font-medium">GIF Integration Coming Soon</p>
                <p className="text-[#a1a1a1] text-sm mt-2">
                  We&apos;ll integrate with Tenor or Giphy API to bring you the best GIFs
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}