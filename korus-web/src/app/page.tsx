'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import LinkPreview from '@/components/LinkPreview';
import VideoPlayer from '@/components/VideoPlayer';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
    }
  }, [connected, router]);

  // Helper function to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
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

  // Mock posts for preview
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
        <div className="flex-1 ml-80 mr-96 border-x border-korus-border bg-korus-surface/10 backdrop-blur-sm">
        {/* Main app - only accessible when connected */}
            {/* What's happening header */}
            <div className="sticky top-0 bg-korus-dark-300/60 backdrop-blur-xl border-b border-korus-border px-4 py-3 z-10">
              <div className="flex items-center justify-center gap-24">
                <button className="text-white text-xl font-bold bg-korus-primary text-black px-6 py-2 rounded-full shadow-lg shadow-korus-primary/40 transition-all duration-200">
                  Home
                </button>
                <button className="text-gray-400 text-xl font-bold hover:bg-korus-primary hover:text-black px-6 py-2 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/40">
                  Games
                </button>
                <button className="text-gray-400 text-xl font-bold hover:bg-korus-primary hover:text-black px-6 py-2 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/40">
                  Events
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
                      <button className="flex items-center gap-2 px-3 py-2 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
                        <span className="text-sm font-medium">🎮 Game</span>
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 bg-korus-surface/40 backdrop-blur-sm border border-korus-borderLight rounded-xl text-korus-primary hover:bg-korus-surface/60 hover:border-korus-border transition-all duration-200 hover:shadow-lg hover:shadow-korus-primary/10">
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
          {mockPosts.map((post) => (
            <div
              key={post.id}
              className={`backdrop-blur-sm p-0 transition-all duration-200 cursor-pointer group ${
                post.isShoutout
                  ? 'shoutout-post border border-[#FFD700] bg-[rgba(255,215,0,0.03)] shadow-[0_4px_12px_rgba(255,215,0,0.3)] hover:border-[#FFD700] hover:shadow-[0_8px_24px_rgba(255,215,0,0.4)] hover:bg-[rgba(255,215,0,0.05)]'
                  : 'border-b border-korus-borderLight bg-korus-surface/20 hover:bg-korus-surface/40 hover:border-korus-border'
              }`}
            >
              {/* Shoutout Banner */}
              {post.isShoutout && (
                <div className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] px-5 py-3 flex items-center justify-center gap-3">
                  <span className="text-white text-lg">📢</span>
                  <span className="text-white font-black text-lg tracking-[3px]">SHOUTOUT</span>
                  <div className="flex gap-1">
                    <span className="text-white text-sm">⭐</span>
                    <span className="text-white text-sm">⭐</span>
                    <span className="text-white text-sm">⭐</span>
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
                  {/* Post Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold hover:underline cursor-pointer ${post.isShoutout ? 'text-[#FFD700]' : 'text-white'}`}>{post.user}</span>

                    {/* Premium Badge */}
                    {post.isPremium && (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
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
                      <button className="text-gray-500 hover:text-white hover:bg-gray-800 rounded-full p-1 transition-colors">
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

                  {/* Link Preview */}
                  {extractUrls(post.content).map((url, index) => (
                    <div key={index} className="mb-3">
                      <LinkPreview url={url} />
                    </div>
                  ))}

                  {/* Video Player */}
                  {(post as any).video && (
                    <div className="mb-3">
                      <VideoPlayer videoUrl={(post as any).video} />
                    </div>
                  )}

                  {/* Post Image */}
                  {post.image && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-gray-800">
                      <img src={post.image} alt="Post content" className="w-full h-auto" />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between max-w-md mt-3">
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                      onClick={(e) => {
                        if ((window as any).createParticleExplosion) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = rect.left + rect.width / 2;
                          const y = rect.top + rect.height / 2;
                          (window as any).createParticleExplosion('reply', x, y);
                        }
                      }}
                    >
                      <svg className="w-4 h-4 text-korus-textTertiary group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-korus-textTertiary text-sm group-hover:text-blue-400 transition-colors font-medium">{post.replies}</span>
                    </button>

                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group">
                      <svg className="w-4 h-4 text-korus-textTertiary group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-korus-textTertiary text-sm group-hover:text-green-400 transition-colors font-medium">12</span>
                    </button>

                    <button
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                      onClick={(e) => {
                        if ((window as any).createParticleExplosion) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = rect.left + rect.width / 2;
                          const y = rect.top + rect.height / 2;
                          (window as any).createParticleExplosion('like', x, y);
                        }
                      }}
                    >
                      <svg className="w-4 h-4 text-korus-textTertiary group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-korus-textTertiary text-sm group-hover:text-red-400 transition-colors font-medium">{post.likes}</span>
                    </button>

                    <button
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                      onClick={(e) => {
                        if ((window as any).createParticleExplosion) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = rect.left + rect.width / 2;
                          const y = rect.top + rect.height / 2;
                          (window as any).createParticleExplosion('tip', x, y);
                        }
                      }}
                    >
                      <svg className="w-4 h-4 text-korus-textTertiary group-hover:text-korus-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-korus-textTertiary text-sm group-hover:text-korus-primary transition-colors font-medium">{post.tips} SOL</span>
                    </button>

                    <button className="flex items-center justify-center w-9 h-9 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group">
                      <svg className="w-4 h-4 text-korus-textTertiary group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <LeftSidebar />
      <RightSidebar />
    </main>
  );
}
