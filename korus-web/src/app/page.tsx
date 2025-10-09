'use client';
import Image from 'next/image';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import LinkPreview from '@/components/LinkPreview';
import VideoPlayer from '@/components/VideoPlayer';
import { FeedSkeleton } from '@/components/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Post } from '@/types';
import { MOCK_POSTS } from '@/data/mockData';
import { postsAPI } from '@/lib/api';

// Dynamically import modals for code splitting
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const PostOptionsModal = dynamic(() => import('@/components/PostOptionsModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });
const ShoutoutModal = dynamic(() => import('@/components/ShoutoutModal'), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const RepostModal = dynamic(() => import('@/components/RepostModal'), { ssr: false });
const ReplyModal = dynamic(() => import('@/components/ReplyModal'), { ssr: false });
const DrawingCanvasInline = dynamic(() => import('@/components/DrawingCanvasInline'), { ssr: false });
const ShoutoutCountdown = dynamic(() => import('@/components/ShoutoutCountdown'), { ssr: false });
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]); // Initialize empty
  const [composeText, setComposeText] = useState('');
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [postToTip, setPostToTip] = useState<Post | null>(null);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [postToRepost, setPostToRepost] = useState<Post | null>(null);
  const [postToReply, setPostToReply] = useState<Post | null>(null);
  const [postInteractions, setPostInteractions] = useState<{[key: number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [shoutoutQueue, setShoutoutQueue] = useState<Post[]>([]); // Queue for pending shoutouts
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  // Initialize posts when component mounts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);

        // Try to fetch from backend API
        const response = await postsAPI.getPosts();

        // If we got posts from the backend, use them
        if (response.posts && response.posts.length > 0) {
          const sortedPosts = [...response.posts].sort((a, b) => {
            if (a.isShoutout && !b.isShoutout) return -1;
            if (!a.isShoutout && b.isShoutout) return 1;
            return 0;
          });
          setPosts(sortedPosts);
        } else {
          // Fallback to mock data if backend returns empty
          console.log('No posts in database, using mock data as fallback');
          const mockPosts = [...MOCK_POSTS].sort((a, b) => {
            if (a.isShoutout && !b.isShoutout) return -1;
            if (!a.isShoutout && b.isShoutout) return 1;
            return 0;
          });
          setPosts(mockPosts);
        }
      } catch (error) {
        console.error('Failed to fetch posts from backend:', error);
        console.log('Using mock data as fallback');

        // Fallback to mock data on error
        const mockPosts = [...MOCK_POSTS].sort((a, b) => {
          if (a.isShoutout && !b.isShoutout) return -1;
          if (!a.isShoutout && b.isShoutout) return 1;
          return 0;
        });
        setPosts(mockPosts);
      } finally {
        setIsLoading(false);
      }
    };

    if (posts.length === 0) {
      fetchPosts();
    }
  }, [posts]);

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
        if (showRepostModal) setShowRepostModal(false);
        if (showReplyModal) setShowReplyModal(false);
        if (showPostOptionsModal) setShowPostOptionsModal(false);
        if (showMobileMenu) setShowMobileMenu(false);
      },
      description: 'Close modal',
    },
  ], { enabled: connected });

  // Helper function to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Modal handlers
  const handlePostCreate = (post: Post) => {
    if (post.isShoutout) {
      // Check if there's already an active shoutout
      const hasActiveShoutout = posts.some(p => p.isShoutout);

      if (hasActiveShoutout) {
        // Add to queue instead of replacing
        setShoutoutQueue(prev => [...prev, post]);
        showSuccess(`Shoutout queued! Position in queue: ${shoutoutQueue.length + 1}`);
      } else {
        // No active shoutout, display immediately
        setPosts(prev => {
          const regularPosts = prev.filter(p => !p.isShoutout);
          return [post, ...regularPosts];
        });
        showSuccess('Shoutout created successfully!');
      }
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

  // Function to activate the next shoutout in queue
  const activateNextShoutout = () => {
    if (shoutoutQueue.length > 0) {
      const [nextShoutout, ...remainingQueue] = shoutoutQueue;

      // Update the start time to now (when it actually starts)
      const activatedShoutout = {
        ...nextShoutout,
        shoutoutStartTime: Date.now()
      };

      setPosts(prev => {
        const regularPosts = prev.filter(p => !p.isShoutout);
        return [activatedShoutout, ...regularPosts];
      });

      setShoutoutQueue(remainingQueue);
      showSuccess('Next shoutout is now active!');
    }
  };

  const handleRegularPost = () => {
    if (!composeText.trim() && selectedFiles.length === 0) return;

    const newPost = {
      id: Date.now(),
      user: publicKey?.toBase58().slice(0, 8) || 'anonymous',
      content: composeText,
      likes: 0,
      replies: 0,
      tips: 0,
      time: 'Just now',
      isPremium: false,
      isShoutout: false,
      isSponsored: false,
      image: selectedFiles.length > 0 && selectedFiles[0].type.startsWith('image/')
        ? URL.createObjectURL(selectedFiles[0])
        : undefined,
      avatar: null
    } as Post;

    // Insert new post after any shoutouts (shoutouts should always be on top)
    setPosts(prev => {
      const shoutouts = prev.filter(p => p.isShoutout);
      const regularPosts = prev.filter(p => !p.isShoutout);
      return [...shoutouts, newPost, ...regularPosts];
    });
    setComposeText('');
    setSelectedFiles([]);
    setShowDrawCanvas(false);
    showSuccess('Post created successfully!');
  };

  const handlePostOptionsClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostOptionsModal(true);
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
    setComposeText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };


  const handleDrawingSave = (drawingDataUrl: string) => {
    // Convert data URL to File and add to selectedFiles
    fetch(drawingDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
        setSelectedFiles(prev => [...prev, file].slice(0, 4));
        setShowDrawCanvas(false);
        showSuccess('Drawing added to your post!');
      })
      .catch(() => {
        showError('Failed to save drawing');
      });
  };

  // Interaction handlers
  const toggleLike = (postId: number) => {
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        liked: !prev[postId]?.liked
      }
    }));
  };

  const toggleRepost = (postId: number, comment?: string) => {
    const originalPost = posts.find(p => p.id === postId);
    if (!originalPost) return;

    const isCurrentlyReposted = postInteractions[postId]?.reposted;

    if (!isCurrentlyReposted) {
      // If the post being reposted is itself a repost, use the original post
      const postToRepost = originalPost.isRepost && originalPost.repostedPost
        ? originalPost.repostedPost
        : originalPost;

      // Create a repost
      const repost = {
        id: Date.now(),
        user: publicKey?.toBase58().slice(0, 15) || 'current_user',
        content: comment || '',
        likes: 0,
        replies: 0,
        tips: 0,
        time: 'now',
        isPremium: false,
        isShoutout: false,
        isSponsored: false,
        image: undefined,
        avatar: null,
        isRepost: true,
        repostedPost: postToRepost,
        repostedBy: publicKey?.toBase58().slice(0, 15) || 'current_user'
      } as Post;

      // Add repost and maintain shoutout priority
      setPosts(prev => {
        const updatedPosts = [repost, ...prev];
        // Sort to keep shoutouts at the top
        return updatedPosts.sort((a, b) => {
          if (a.isShoutout && !b.isShoutout) return -1;
          if (!a.isShoutout && b.isShoutout) return 1;
          return 0;
        });
      });
    } else {
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
  };

  const markReplied = (postId: number) => {
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        replied: true
      }
    }));
  };

  const markTipped = (postId: number) => {
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        tipped: true
      }
    }));
  };


  return (
    <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
      {/* Mobile app style gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
        {/* Surface gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
      </div>

      {/* Subtle animated gradient orbs - more like mobile app */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Primary gradient orb */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px] animate-float" />

        {/* Secondary gradient orb */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px] animate-float-delayed" />

        {/* Accent orb for depth */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px] animate-pulse-slow" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Main Content Container */}
      <div className="flex min-h-screen">
        {/* Main Feed */}
        <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
        {/* Main app - only accessible when connected */}
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

            {/* Compose Post */}
            <div className="border-b border-korus-border bg-korus-surface/20 backdrop-blur-sm p-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-korus-primary/20">
                  <span className="text-black font-bold">
                    {publicKey?.toBase58().slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder="What's on your mind? Share your experience, ask for advice, or offer support..."
                    className={`w-full bg-transparent text-white text-xl resize-none outline-none placeholder-korus-textTertiary ${showDrawCanvas ? 'min-h-[60px]' : 'min-h-[120px]'}`}
                    rows={showDrawCanvas ? 2 : 3}
                  />

                  {/* Inline Drawing Canvas */}
                  {showDrawCanvas && (
                    <div className="mt-3 p-3 bg-korus-surface/20 border border-korus-borderLight rounded-xl">
                      <DrawingCanvasInline
                        onSave={handleDrawingSave}
                        onClose={() => setShowDrawCanvas(false)}
                      />
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
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      {/* Image Upload */}
                      <label className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 ${
                          showGifPicker
                            ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                            : 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
                        }`}
                      >
                        <span className="text-xs font-bold">GIF</span>
                      </button>
                      {/* Draw/Pen Button */}
                      <button
                        onClick={() => setShowDrawCanvas(!showDrawCanvas)}
                        className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 ${
                          showDrawCanvas
                            ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                            : 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {/* Emoji Button */}
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm border rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10 ${
                          showEmojiPicker
                            ? 'bg-korus-primary/20 border-korus-primary text-korus-primary'
                            : 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => (composeText.trim() || selectedFiles.length > 0) && setShowShoutoutModal(true)}
                        disabled={!composeText.trim() && selectedFiles.length === 0}
                        className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm border rounded-xl transition-all duration-200 ${
                          composeText.trim() || selectedFiles.length > 0
                            ? 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer'
                            : 'bg-korus-surface/20 border-korus-borderLight/50 text-korus-textTertiary cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="text-sm font-medium">📢 Shoutout</span>
                      </button>
                    </div>

                    <button
                      onClick={handleRegularPost}
                      disabled={!composeText.trim() && selectedFiles.length === 0}
                      className="px-6 py-2 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Shoutout Queue Indicator */}
            {shoutoutQueue.length > 0 && (
              <div className="bg-korus-surface/40 border border-korus-border rounded-xl p-4 mb-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-korus-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold">Shoutout Queue:</span>
                  </div>
                  <span className="text-white">
                    {shoutoutQueue.length} shoutout{shoutoutQueue.length > 1 ? 's' : ''} waiting
                  </span>
                </div>
              </div>
            )}

            {/* Feed Posts */}
            <div>
          {isLoading ? (
            <FeedSkeleton count={5} />
          ) : (
            posts.map((post) => (
            <div
              key={post.id}
              className={`backdrop-blur-sm p-0 transition-all duration-200 cursor-pointer group ${
                post.isShoutout
                  ? 'shoutout-post border border-korus-primary bg-korus-primary/5 shadow-[0_4px_12px_rgba(var(--korus-primary-rgb),0.3)] hover:border-korus-primary hover:shadow-[0_8px_24px_rgba(var(--korus-primary-rgb),0.4)] hover:bg-korus-primary/10'
                  : 'border-b border-korus-borderLight bg-korus-surface/20 hover:bg-korus-surface/40 hover:border-korus-border'
              }`}
              onClick={() => router.push(`/post/${post.id}`)}
            >
              {/* Shoutout Banner */}
              {post.isShoutout && (
                <div className="bg-gradient-to-r from-korus-primary to-korus-secondary px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-black text-lg">📢</span>
                    <span className="text-black font-black text-lg tracking-[3px]">SHOUTOUT</span>
                    <div className="flex gap-1">
                      <span className="text-black text-sm">⭐</span>
                      <span className="text-black text-sm">⭐</span>
                      <span className="text-black text-sm">⭐</span>
                    </div>
                  </div>
                  {post.shoutoutStartTime && post.shoutoutDuration && (
                    <ShoutoutCountdown
                      startTime={post.shoutoutStartTime}
                      duration={post.shoutoutDuration}
                      onExpire={() => {
                        // Remove the expired shoutout
                        setPosts(prev => prev.filter(p => p.id !== post.id));
                        // Activate next shoutout in queue
                        activateNextShoutout();
                      }}
                    />
                  )}
                </div>
              )}

              <div className={`flex gap-4 ${post.isShoutout ? 'p-6' : 'p-6'}`}>
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
                  {post.user.slice(0, 2).toUpperCase()}
                </div>

                {/* Post Content */}
                <div className="flex-1 min-w-0">
                  {/* Reposted By Indicator */}
                  {post.isRepost && post.repostedBy && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3.5 h-3.5 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs text-korus-textSecondary font-medium">
                        {post.repostedBy} reposted
                      </span>
                    </div>
                  )}

                  {/* Post Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/profile/${post.wallet || post.user}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`font-bold hover:underline cursor-pointer ${post.isShoutout ? 'text-korus-primary' : 'text-white'}`}
                    >
                      {post.user}
                    </Link>

                    {/* Premium Badge */}
                    {post.isPremium && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                        <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                        </svg>
                      </div>
                    )}

                    <span className="text-korus-textSecondary">@{post.user}</span>
                    <span className="text-korus-textSecondary">·</span>
                    <span className="text-korus-textSecondary hover:underline cursor-pointer">{post.time}</span>

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
                        className="text-korus-textSecondary hover:text-white hover:bg-korus-surface/60 rounded-full p-1 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Reposted Post */}
                  {post.isRepost && post.repostedPost ? (
                    <>
                      {/* User's comment on the repost (if any) */}
                      {post.content && (
                        <div className="text-white text-base leading-normal mb-3 whitespace-pre-wrap break-words">
                          {post.content}
                        </div>
                      )}

                      {/* Original Post in green box */}
                      <div className="mb-3 border-2 rounded-xl p-4" style={{ background: 'linear-gradient(90deg, rgba(67, 233, 123, 0.1), rgba(56, 239, 125, 0.1))', borderColor: 'rgba(67, 233, 123, 0.3)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black" style={{ background: 'linear-gradient(135deg, #43E97B, #38EF7D)' }}>
                            {post.repostedPost.user.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{post.repostedPost.user}</span>
                          <span className="text-korus-textSecondary text-sm">· {post.repostedPost.time}</span>
                        </div>
                        <p className="text-korus-text text-sm leading-relaxed">{post.repostedPost.content}</p>
                        {post.repostedPost.image && (
                          <Image src={post.repostedPost.image} alt="Reposted content" width={600} height={400} className="mt-3 w-full rounded-lg" />
                        )}
                      </div>
                    </>
                  ) : (
                    /* Regular Post Text */
                    post.content && (
                      <div className="text-white text-base leading-normal mb-3 whitespace-pre-wrap break-words">
                        {post.content}
                      </div>
                    )
                  )}

                  {/* Link Preview */}
                  {!post.isRepost && extractUrls(post.content).map((url, index) => (
                    <div key={index} className="mb-3">
                      <LinkPreview url={url} />
                    </div>
                  ))}

                  {/* Video Player */}
                  {!post.isRepost && post.video && (
                    <div className="mb-3">
                      <VideoPlayer videoUrl={post.video} />
                    </div>
                  )}

                  {/* Post Image */}
                  {!post.isRepost && post.image && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-korus-border">
                      <Image
                        src={post.image}
                        alt="Post content"
                        width={600}
                        height={400}
                        className="w-full h-auto"
                        onError={(e) => {
                          // Hide broken image on error
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between max-w-md mt-3">
                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        postInteractions[post.id]?.replied
                          ? 'bg-korus-primary/20 border border-korus-primary/40'
                          : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostToReply(post);
                        setShowReplyModal(true);
                      }}
                    >
                      <svg className={`w-4 h-4 transition-colors ${
                        postInteractions[post.id]?.replied ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className={`text-sm transition-colors font-medium ${
                        postInteractions[post.id]?.replied ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`}>{post.replies}</span>
                    </button>

                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        postInteractions[post.id]?.reposted
                          ? 'bg-korus-primary/20 border border-korus-primary/40'
                          : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostToRepost(post);
                        setShowRepostModal(true);
                      }}
                    >
                      <svg className={`w-4 h-4 transition-colors ${
                        postInteractions[post.id]?.reposted ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className={`text-sm transition-colors font-medium ${
                        postInteractions[post.id]?.reposted ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`}>{posts.filter(p => p.repostedPost?.id === post.id).length || 0}</span>
                    </button>

                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        postInteractions[post.id]?.liked
                          ? 'bg-korus-primary/20 border border-korus-primary/40'
                          : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                      }`}
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
                      <svg className={`w-4 h-4 transition-colors ${
                        postInteractions[post.id]?.liked ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`} fill={postInteractions[post.id]?.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className={`text-sm transition-colors font-medium ${
                        postInteractions[post.id]?.liked ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`}>{post.likes}</span>
                    </button>

                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        postInteractions[post.id]?.tipped
                          ? 'bg-korus-primary/20 border border-korus-primary/40'
                          : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostToTip(post);
                        setShowTipModal(true);
                      }}
                    >
                      <svg className={`w-4 h-4 transition-colors ${
                        postInteractions[post.id]?.tipped ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={`text-sm transition-colors font-medium ${
                        postInteractions[post.id]?.tipped ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                      }`}>{post.tips} SOL</span>
                    </button>

                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostToShare(post);
                        setShowShareModal(true);
                      }}
                    >
                      <svg className="w-4 h-4 text-korus-textTertiary group-hover:text-korus-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
          )}
            </div>
        </div>
      </div>
      </div>

      <LeftSidebar
        onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        onPostButtonClick={() => setShowCreatePostModal(true)}
        onSearchClick={() => setShowSearchModal(true)}
      />
      <RightSidebar
        showNotifications={showNotifications}
        onNotificationsClose={() => setShowNotifications(false)}
      />

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={handlePostCreate}
        queueInfo={{
          activeShoutout: null,
          queuedShoutouts: []
        }}
      />

      <PostOptionsModal
        isOpen={showPostOptionsModal}
        onClose={() => setShowPostOptionsModal(false)}
        postId={selectedPost?.id || 0}
        postUser={selectedPost?.user || ''}
        isOwnPost={selectedPost?.user === publicKey?.toBase58()}
      />


      <ShoutoutModal
        isOpen={showShoutoutModal}
        onClose={() => setShowShoutoutModal(false)}
        postContent={composeText}
        onConfirm={(duration, price) => {
          // Handle shoutout creation
          showSuccess(`Shoutout created for ${duration} minutes at ${price} SOL!`);
          setComposeText(''); // Clear compose text after shoutout
        }}
        queueInfo={{
          activeShoutout: null,
          queuedShoutouts: []
        }}
      />

      <TipModal
        isOpen={showTipModal}
        onClose={() => {
          setShowTipModal(false);
          setPostToTip(null);
        }}
        recipientUser={postToTip?.user || ''}
        postId={postToTip?.id}
        onTipSuccess={() => {
          if (postToTip?.id) {
            markTipped(postToTip.id);
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

      <RepostModal
        isOpen={showRepostModal}
        onClose={() => {
          setShowRepostModal(false);
          setPostToRepost(null);
        }}
        postId={postToRepost?.id || 0}
        postContent={postToRepost?.content || ''}
        postUser={postToRepost?.user || ''}
        onRepostSuccess={(comment) => {
          if (postToRepost?.id) {
            toggleRepost(postToRepost.id, comment);
          }
        }}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-korus-surface/95 backdrop-blur-md rounded-2xl max-w-md w-full max-h-[80vh] border border-korus-border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Emoji Grid */}
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-korus-border">
              <h3 className="text-lg font-bold text-white">Choose GIF</h3>
              <button
                onClick={() => setShowGifPicker(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* GIF Grid - Placeholder for now */}
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

      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
