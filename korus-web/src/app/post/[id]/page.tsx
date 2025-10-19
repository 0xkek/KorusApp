'use client';
import Image from 'next/image';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import ReplyModal from '@/components/ReplyModal';
import PostOptionsModal from '@/components/PostOptionsModal';
import { useToast } from '@/hooks/useToast';
import { postsAPI, repliesAPI, uploadAPI, interactionsAPI } from '@/lib/api';
import type { Post, Reply } from '@/types';
import { MOCK_POSTS, MOCK_REPLIES } from '@/data/mockData';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });
const RepostModal = dynamic(() => import('@/components/RepostModal'), { ssr: false });
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
  const [liked, setLiked] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<number>>(new Set());
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
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [postToRepost, setPostToRepost] = useState<Post | null>(null);
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
        const response = await postsAPI.getPost(Number(postId));

        if (response) {
          // Transform backend post to frontend format
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const backendPost = response as any;
          const transformedPost = {
            ...backendPost,
            user: backendPost.authorWallet || backendPost.author?.walletAddress || 'Unknown',
            wallet: backendPost.authorWallet,
            time: new Date(backendPost.createdAt).toLocaleString(),
            likes: backendPost.likeCount || 0,
            comments: backendPost.replyCount || 0,
            reposts: 0,
            tips: backendPost.tipCount || 0,
            image: backendPost.imageUrl,
          };

          setPost(transformedPost as Post);

          // Fetch user's like status if authenticated
          if (isAuthenticated && token) {
            try {
              const interactionsResponse = await interactionsAPI.getUserInteractions([postId], token);
              if (interactionsResponse.success && interactionsResponse.interactions[postId]) {
                setLiked(interactionsResponse.interactions[postId].liked);
              }
            } catch (error) {
              console.error('Failed to fetch user interactions:', error);
            }
          }

          // Fetch replies
          const repliesResponse = await repliesAPI.getReplies(postId);
          if (repliesResponse.success) {
            console.log('Raw replies from backend:', repliesResponse.replies);
            // Transform replies to frontend format
            const transformedReplies = repliesResponse.replies.map(reply => {
              const transformed = {
                id: reply.id as unknown,
                postId: postId, // Include the post ID for nested replies
                user: reply.author?.walletAddress || reply.authorWallet || 'Unknown',
                wallet: reply.authorWallet,
                content: reply.content,
                likes: reply.likeCount || 0,
                replies: reply.childReplies?.map(child => ({
                  id: child.id as unknown,
                  postId: postId, // Include the post ID for nested replies
                  user: child.author?.walletAddress || child.authorWallet || 'Unknown',
                  wallet: child.authorWallet,
                  content: child.content,
                  likes: child.likeCount || 0,
                  replies: [],
                  time: new Date(child.createdAt).toLocaleString(),
                  isPremium: false,
                  image: child.imageUrl
                })) || [],
                time: new Date(reply.createdAt).toLocaleString(),
                isPremium: false,
                image: reply.imageUrl
              };
              console.log('Transformed reply:', transformed);
              return transformed;
            });
            console.log('Setting transformed replies:', transformedReplies);
            setReplies(transformedReplies as Reply[]);
          }
        }
      } catch (backendError) {
        console.error('Backend fetch failed, trying mock data:', backendError);
        // Fallback to mock data
        const foundPost = MOCK_POSTS.find(p => String(p.id) === postId);
        if (foundPost) {
          setPost(foundPost);
          setReplies(MOCK_REPLIES);
        }
      }
    } catch (error) {
      console.error('Failed to load post:', error);
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
      console.error('Failed to like post:', error);
      // Revert on error
      setLiked(previousLiked);
      setPost({
        ...post,
        likes: previousLikes
      });
      showError('Failed to like post. Please try again.');
    }
  };

  const handleLikeReply = (replyId: number) => {
    const newLikedReplies = new Set(likedReplies);
    const isLiked = likedReplies.has(replyId);

    if (isLiked) {
      newLikedReplies.delete(replyId);
    } else {
      newLikedReplies.add(replyId);
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

    setReplies(updateReplyLikes(replies));
  };

  const toggleReplyExpansion = (replyId: number) => {
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
          console.log('Uploading reply image...');
          const uploadResponse = await uploadAPI.uploadImage(imageFile, token);
          imageUrl = uploadResponse.url;
          console.log('Reply image uploaded:', imageUrl);
        }
      }

      // Create reply via backend API
      const response = await repliesAPI.createReply(
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
      console.error('Failed to post reply:', error);
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
      <div key={reply.id} className="">
        {/* Reply Content */}
        <div className="pl-4 py-3 hover:bg-korus-surface/5 transition-colors">
          <div className="border-b border-korus-primary/20 pb-3 mb-3 mr-6">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0">
              {reply.user.slice(0, 2).toUpperCase()}
            </div>

            {/* Reply Body */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/profile/${reply.wallet || reply.user}`}
                  className="font-bold text-white hover:underline"
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
                <span className="text-korus-textSecondary">@{truncateAddress(reply.user)}</span>
                <span className="text-korus-textSecondary">·</span>
                <span className="text-korus-textSecondary">{reply.time}</span>
              </div>

              {/* Content */}
              <div className="text-white text-base mb-3 whitespace-pre-wrap break-words">
                {reply.content}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between max-w-md">
                <button
                  onClick={() => handleReply(reply)}
                  aria-label="Reply to comment"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                >
                  <svg className="w-4 h-4 transition-colors text-korus-textTertiary group-hover:text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  {hasReplies && <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">{reply.replies.length}</span>}
                </button>

                <button
                  onClick={() => {
                    setPostToRepost(convertReplyToPost(reply));
                    setShowRepostModal(true);
                  }}
                  aria-label="Repost"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                >
                  <svg className="w-4 h-4 transition-colors text-korus-textTertiary group-hover:text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">0</span>
                </button>

                <button
                  onClick={() => handleLikeReply(reply.id)}
                  aria-label={likedReplies.has(reply.id) ? "Unlike reply" : "Like reply"}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                    likedReplies.has(reply.id)
                      ? 'bg-korus-primary/20 border border-korus-primary/40'
                      : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                  }`}
                >
                  <svg className={`w-4 h-4 transition-colors ${
                    likedReplies.has(reply.id) ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                  }`} fill={likedReplies.has(reply.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                  <span className={`text-sm transition-colors font-medium ${
                    likedReplies.has(reply.id) ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                  }`}>{reply.likes}</span>
                </button>

                <button
                  onClick={() => {
                    setPostToTip(convertReplyToPost(reply));
                    setShowTipModal(true);
                  }}
                  aria-label="Send tip (0 SOL)"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                >
                  <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">$</span>
                  <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">0 SOL</span>
                </button>

                <button
                  onClick={() => {
                    setPostToShare(convertReplyToPost(reply));
                    setShowShareModal(true);
                  }}
                  aria-label="Share reply"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                >
                  <svg className="w-4 h-4 transition-colors text-korus-textTertiary group-hover:text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                </button>
              </div>

              {/* Show replies toggle */}
              {hasReplies && (
                <button
                  onClick={() => toggleReplyExpansion(reply.id)}
                  className="mt-3 text-korus-primary hover:underline text-sm"
                >
                  {reply.isExpanded
                    ? `Hide ${reply.replies.length} ${reply.replies.length === 1 ? 'reply' : 'replies'}`
                    : `Show ${reply.replies.length} ${reply.replies.length === 1 ? 'reply' : 'replies'}`
                  }
                </button>
              )}
            </div>
          </div>
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
      <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-korus-primary animate-pulse">Loading post...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Post Not Found</h2>
            <p className="text-korus-textTertiary mb-8">The post you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/"
              className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-[1.02]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        <div className="flex min-h-screen">
          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">

            {/* Header Navigation */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10">
              <div className="flex">
                {/* Mobile menu button */}
                <button
                  onClick={() => setShowMobileMenu(true)}
                  aria-label="Open mobile menu"
                  className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Logo on mobile */}
                <div className="md:hidden flex items-center px-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">K</span>
                  </div>
                </div>

                <div className="relative flex items-center justify-center w-full">
                  <button
                    onClick={() => router.push('/')}
                    className="relative px-4 py-4 text-white font-semibold hover:bg-korus-surface/20 transition-colors group"
                  >
                    <span className="relative z-10">Home</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-korus-primary rounded-full"></div>
                  </button>
                  <button
                    onClick={() => router.push('/games')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-korus-textSecondary font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                </div>

                {/* Mobile search/menu */}
                <button
                  onClick={() => setShowSearchModal(true)}
                  aria-label="Open search"
                  className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
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

              <div className="px-6 py-6">
              <div className="border-b border-korus-primary/20 pb-6 mb-6">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
                  {post.user.slice(0, 2).toUpperCase()}
                </div>

                {/* Post Content */}
                <div className="flex-1 min-w-0">
                  {/* Post Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/profile/${post.wallet || post.user}`}
                      className={`font-bold hover:underline cursor-pointer ${post.isShoutout ? 'text-korus-primary' : 'text-white'}`}
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

                    <span className="text-korus-textSecondary">@{truncateAddress(post.user)}</span>
                    <span className="text-korus-textSecondary">·</span>
                    <span className="text-korus-textSecondary hover:underline cursor-pointer">{post.time}</span>

                    {/* More button */}
                    <div className="ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                          setShowPostOptionsModal(true);
                        }}
                        className="text-korus-textSecondary hover:text-white hover:bg-korus-surface/60 rounded-full p-1 transition-colors"
                        aria-label="Post options"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Post Text */}
                  <div className="text-white text-base leading-normal mb-3 whitespace-pre-wrap break-words">
                    {post.content}
                  </div>

                  {/* Post Image */}
                  {post.image && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-korus-border">
                      <Image src={post.image} alt="Post content" width={600} height={400} className="w-full h-auto" />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between max-w-md mt-3">
                    <button
                      onClick={() => handleReply(post)}
                      aria-label="Reply to post"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                    >
                      <svg className="w-4 h-4 transition-colors text-korus-textTertiary group-hover:text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">{post.comments}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPostToRepost(post);
                        setShowRepostModal(true);
                      }}
                      aria-label="Repost"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                    >
                      <svg className="w-4 h-4 transition-colors text-korus-textTertiary group-hover:text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">0</span>
                    </button>

                    <button
                      onClick={handleLike}
                      aria-label={liked ? "Unlike post" : "Like post"}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        liked
                          ? 'bg-korus-primary/20 border border-korus-primary/40'
                          : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                      }`}
                    >
                      <svg className={`w-4 h-4 transition-colors ${
                        liked ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                      <span className={`text-sm transition-colors font-medium ${
                        liked ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`}>{post.likes}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPostToTip(post);
                        setShowTipModal(true);
                      }}
                      aria-label={`Send tip (${post.tips} SOL)`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                    >
                      <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">$</span>
                      <span className="text-sm transition-colors font-medium text-korus-textTertiary group-hover:text-korus-primary">{post.tips} SOL</span>
                    </button>

                    <button
                      onClick={() => {
                        setPostToShare(post);
                        setShowShareModal(true);
                      }}
                      aria-label="Share post"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight"
                    >
                      <svg className="w-4 h-4 transition-colors text-korus-textTertiary group-hover:text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              </div>
              </div>
            </div>

            {/* Inline Reply Composer */}
            <div className="border-b border-korus-border/50">
              <div className="px-6 py-4">
                <div className="flex gap-3 items-start">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold text-base">
                      {publicKey?.toBase58().slice(0, 2).toUpperCase() || 'U'}
                    </span>
                  </div>

                  <div className="flex-1">
                    <textarea
                      value={inlineReplyContent}
                      onChange={(e) => setInlineReplyContent(e.target.value)}
                      placeholder="Post your reply..."
                      className="w-full bg-transparent text-white text-base resize-none placeholder-korus-textSecondary min-h-[28px] max-h-[300px] leading-6"
                      style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
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
                                className="w-full object-cover rounded-xl border border-korus-border"
                              />
                            ) : (
                              <div className="w-full h-32 bg-korus-surface/40 border border-korus-border rounded-xl flex items-center justify-center">
                                <div className="text-center">
                                  <svg className="w-8 h-8 mx-auto mb-2 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-xs text-korus-textSecondary truncate px-2">{file.name}</p>
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => removeFile(index)}
                              aria-label="Remove file"
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

                    {/* Reply Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        {/* Media Upload */}
                        <label className="flex items-center justify-center w-8 h-8 rounded-full text-korus-primary/60 hover:text-korus-primary hover:bg-korus-surface/20 transition-all duration-200 cursor-pointer">
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
                          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                            showGifPicker
                              ? 'text-korus-primary bg-korus-primary/20'
                              : 'text-korus-primary/60 hover:text-korus-primary hover:bg-korus-surface/20'
                          }`}
                        >
                          <span className="text-xs font-bold">GIF</span>
                        </button>

                        {/* Emoji Button */}
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          aria-label="Add emoji"
                          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                            showEmojiPicker
                              ? 'text-korus-primary bg-korus-primary/20'
                              : 'text-korus-primary/60 hover:text-korus-primary hover:bg-korus-surface/20'
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
                              : 'text-korus-textSecondary/60'
                          }`}>
                            {inlineReplyContent.length > 280 && `-${inlineReplyContent.length - 280}`}
                            {inlineReplyContent.length <= 280 && `${280 - inlineReplyContent.length}`}
                          </div>
                        )}

                        {/* Reply Button */}
                        <button
                          onClick={handleInlineReply}
                          disabled={!inlineReplyContent.trim() || inlineReplyContent.length > 280 || isPostingReply || !connected}
                          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                            !inlineReplyContent.trim() || inlineReplyContent.length > 280 || isPostingReply || !connected
                              ? 'bg-korus-primary/20 text-korus-primary/40 cursor-not-allowed'
                              : 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black hover:shadow-lg hover:shadow-korus-primary/20'
                          }`}
                        >
                          {isPostingReply ? 'Posting...' : !connected ? 'Connect' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies Section */}
            <div className="border-l-2 border-korus-primary/20 ml-6">
              {replies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-korus-textTertiary">No replies yet. Be the first to reply!</p>
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
        allPosts={MOCK_POSTS}
      />

      {/* Mobile Menu Modal */}
      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />

      {/* Repost Modal */}
      <RepostModal
        isOpen={showRepostModal}
        onClose={() => {
          setShowRepostModal(false);
          setPostToRepost(null);
        }}
        postId={postToRepost?.id || 0}
        postContent={postToRepost?.content || ''}
        postUser={postToRepost?.user || ''}
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
          <div className="bg-korus-surface/95 backdrop-blur-md rounded-2xl max-w-md w-full max-h-[80vh] border border-korus-border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                aria-label="Close emoji picker"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
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
                    className="w-10 h-10 text-xl hover:bg-korus-surface/60 rounded-lg transition-colors flex items-center justify-center hover:scale-110 transform"
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
          <div className="bg-korus-surface/95 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[80vh] border border-korus-border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose GIF</h3>
              <button
                onClick={() => setShowGifPicker(false)}
                aria-label="Close GIF picker"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-korus-text text-lg font-medium">GIF Integration Coming Soon</p>
                <p className="text-korus-textSecondary text-sm mt-2">
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