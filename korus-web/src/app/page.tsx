'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import LinkPreview from '@/components/LinkPreview';
import VideoPlayer from '@/components/VideoPlayer';
import CreatePostModal from '@/components/CreatePostModal';
import PostOptionsModal from '@/components/PostOptionsModal';
import MobileMenuModal from '@/components/MobileMenuModal';
import ShoutoutModal from '@/components/ShoutoutModal';
import TipModal from '@/components/TipModal';
import ShareModal from '@/components/ShareModal';
import RepostModal from '@/components/RepostModal';
import ReplyModal from '@/components/ReplyModal';
import { useToast } from '@/hooks/useToast';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [posts, setPosts] = useState<any[]>([]); // Initialize empty
  const [composeText, setComposeText] = useState('');
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [postToTip, setPostToTip] = useState<any>(null);
  const [postToShare, setPostToShare] = useState<any>(null);
  const [postToRepost, setPostToRepost] = useState<any>(null);
  const [postToReply, setPostToReply] = useState<any>(null);
  const [postInteractions, setPostInteractions] = useState<{[key: number]: {liked: boolean, reposted: boolean, replied: boolean, tipped: boolean}}>({});

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  // Initialize posts when component mounts
  useEffect(() => {
    if (posts.length === 0) {
      // Define mock posts inline
      const allPosts = [
        {
          id: 1,
          user: 'solana_dev',
          content: 'Just deployed my first smart contract on Solana! The speed is insane ⚡',
          likes: 42,
          replies: 8,
          tips: 0.5,
          time: '2h ago',
          isPremium: true,
          isShoutout: false,
          isSponsored: false,
          image: null,
          avatar: null
        },
        {
          id: 2,
          user: 'nft_collector',
          content: 'Check out this new NFT collection I found! The art is incredible 🎨',
          likes: 28,
          replies: 5,
          tips: 0.3,
          time: '4h ago',
          isPremium: false,
          isShoutout: true,
          isSponsored: false,
          image: 'https://picsum.photos/600/400?random=1',
          avatar: null
        },
        {
          id: 3,
          user: 'game_master',
          content: 'Who wants to play Tic Tac Toe? 0.1 SOL wager 🎮',
          likes: 15,
          replies: 3,
          tips: 0.1,
          time: '6h ago',
          isPremium: false,
          isShoutout: false,
          isSponsored: true,
          image: null,
          avatar: null
        },
        {
          id: 4,
          user: 'crypto_news',
          content: 'Amazing tutorial on building with Solana! Check it out: https://solana.com',
          likes: 67,
          replies: 12,
          tips: 1.2,
          time: '8h ago',
          isPremium: true,
          isShoutout: false,
          isSponsored: false,
          image: null,
          avatar: null
        },
        {
          id: 5,
          user: 'tech_explorer',
          content: 'Just found this awesome video https://youtube.com/watch?v=dQw4w9WgXcQ',
          likes: 34,
          replies: 7,
          tips: 0.4,
          time: '10h ago',
          isPremium: false,
          isShoutout: false,
          isSponsored: false,
          image: null,
          avatar: null
        },
        {
          id: 6,
          user: 'video_creator',
          content: 'Check out my latest tutorial on Solana development! 🎥',
          likes: 89,
          replies: 15,
          tips: 2.5,
          time: '12h ago',
          isPremium: true,
          isShoutout: false,
          isSponsored: false,
          image: null,
          video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          avatar: null
        }
      ];

      // Sort posts: shoutouts first, then regular posts
      const mockPosts = [...allPosts].sort((a, b) => {
        if (a.isShoutout && !b.isShoutout) return -1;
        if (!a.isShoutout && b.isShoutout) return 1;
        return 0;
      });

      setPosts(mockPosts);
    }
  }, [posts]);

  // Helper function to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Modal handlers
  const handlePostCreate = (post: any) => {
    setPosts(prev => [post, ...prev]);
    showSuccess('Post created successfully!');
  };

  const handlePostOptionsClick = (post: any) => {
    setSelectedPost(post);
    setShowPostOptionsModal(true);
  };

  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
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
      const postToRepost = (originalPost as any).isRepost && (originalPost as any).repostedPost
        ? (originalPost as any).repostedPost
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
        image: null,
        avatar: null,
        isRepost: true,
        repostedPost: postToRepost,
        repostedBy: publicKey?.toBase58().slice(0, 15) || 'current_user'
      };

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

  // Helper function for double-tap to like
  const handleDoubleTap = (e: React.MouseEvent, postId: number) => {
    // Trigger particle animation at click position
    if ((window as any).createParticleExplosion) {
      const x = e.clientX;
      const y = e.clientY;
      (window as any).createParticleExplosion('like', x, y);
    }

    // Show a heart animation overlay
    const target = e.currentTarget as HTMLElement;
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.style.cssText = `
      position: absolute;
      font-size: 80px;
      pointer-events: none;
      z-index: 100;
      animation: heartPop 0.6s ease-out forwards;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(0);
    `;
    target.style.position = 'relative';
    target.appendChild(heart);

    setTimeout(() => heart.remove(), 600);
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
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors">
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
                    className="relative px-4 py-4 text-gray-400 font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Games</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                  <button
                    onClick={() => router.push('/events')}
                    className="relative px-4 py-4 text-gray-400 font-semibold hover:bg-korus-surface/20 hover:text-white transition-colors group"
                  >
                    <span className="relative z-10">Events</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent group-hover:bg-korus-primary/50 rounded-full transition-colors"></div>
                  </button>
                </div>

                {/* Mobile search/menu */}
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Compose Post */}
            <div className="border-b border-korus-border bg-korus-surface/30 backdrop-blur-sm p-4">
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
                    className="w-full bg-transparent text-white text-xl resize-none outline-none placeholder-korus-textTertiary min-h-[120px]"
                    rows={3}
                  />

                  {/* Post Options */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button className="flex items-center justify-center w-10 h-10 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => composeText.trim() && setShowShoutoutModal(true)}
                        disabled={!composeText.trim()}
                        className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm border rounded-xl transition-all duration-200 ${
                          composeText.trim()
                            ? 'bg-korus-surface/40 border-korus-borderLight text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border hover:shadow-lg hover:shadow-korus-primary/10 cursor-pointer'
                            : 'bg-korus-surface/20 border-korus-borderLight/50 text-korus-textTertiary cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="text-sm font-medium">📢 Shoutout</span>
                      </button>
                    </div>

                    <button className="px-6 py-2 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold rounded-xl hover:shadow-lg hover:shadow-korus-primary/30 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed Posts */}
            <div>
          {posts.map((post) => (
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
                <div className="bg-gradient-to-r from-korus-primary to-korus-secondary px-5 py-3 flex items-center justify-center gap-3">
                  <span className="text-black text-lg">📢</span>
                  <span className="text-black font-black text-lg tracking-[3px]">SHOUTOUT</span>
                  <div className="flex gap-1">
                    <span className="text-black text-sm">⭐</span>
                    <span className="text-black text-sm">⭐</span>
                    <span className="text-black text-sm">⭐</span>
                  </div>
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
                  {(post as any).isRepost && (post as any).repostedBy && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3.5 h-3.5 text-korus-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs text-korus-textSecondary font-medium">
                        {(post as any).repostedBy} reposted
                      </span>
                    </div>
                  )}

                  {/* Post Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold hover:underline cursor-pointer ${post.isShoutout ? 'text-korus-primary' : 'text-white'}`}>{post.user}</span>

                    {/* Premium Badge */}
                    {post.isPremium && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                        <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                          <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                        </svg>
                      </div>
                    )}

                    <span className="text-gray-500">@{post.user}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500 hover:underline cursor-pointer">{post.time}</span>

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
                        className="text-gray-500 hover:text-white hover:bg-gray-800 rounded-full p-1 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Reposted Post */}
                  {(post as any).isRepost && (post as any).repostedPost ? (
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
                            {(post as any).repostedPost.user.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{(post as any).repostedPost.user}</span>
                          <span className="text-korus-textSecondary text-sm">· {(post as any).repostedPost.time}</span>
                        </div>
                        <p className="text-korus-text text-sm leading-relaxed">{(post as any).repostedPost.content}</p>
                        {(post as any).repostedPost.image && (
                          <img src={(post as any).repostedPost.image} alt="Reposted content" className="mt-3 w-full rounded-lg" />
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
                  {!((post as any).isRepost) && extractUrls(post.content).map((url, index) => (
                    <div key={index} className="mb-3">
                      <LinkPreview url={url} />
                    </div>
                  ))}

                  {/* Video Player */}
                  {!((post as any).isRepost) && (post as any).video && (
                    <div className="mb-3">
                      <VideoPlayer videoUrl={(post as any).video} />
                    </div>
                  )}

                  {/* Post Image */}
                  {!((post as any).isRepost) && post.image && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-gray-800">
                      <img src={post.image} alt="Post content" className="w-full h-auto" />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between max-w-md mt-3">
                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        postInteractions[post.id]?.replied
                          ? 'bg-korus-primary/20 border border-korus-primary/50'
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
                          ? 'bg-korus-primary/20 border border-korus-primary/50'
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
                      }`}>12</span>
                    </button>

                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
                        postInteractions[post.id]?.liked
                          ? 'bg-korus-primary/20 border border-korus-primary/50'
                          : 'border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(post.id);
                        if ((window as any).createParticleExplosion) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = rect.left + rect.width / 2;
                          const y = rect.top + rect.height / 2;
                          (window as any).createParticleExplosion('like', x, y);
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
                          ? 'bg-korus-primary/20 border border-korus-primary/50'
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
          ))}

            </div>
        </div>
      </div>
      </div>

      <LeftSidebar
        onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        onPostButtonClick={() => setShowCreatePostModal(true)}
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
              return {
                ...p,
                replies: p.replies + 1,
                replyThreads: [...(p.replyThreads || []), reply]
              };
            }
            return p;
          }));

          // Mark the original post as replied
          if (postToReply?.id) {
            markReplied(postToReply.id);
          }
        }}
      />

      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
