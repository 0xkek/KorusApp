'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';

interface Reply {
  id: number;
  user: string;
  userWallet: string;
  userAvatar?: string;
  content: string;
  likes: number;
  tips: number;
  time: string;
  timeAgo: string;
  isPremium?: boolean;
}

interface Post {
  id: number;
  user: string;
  userWallet: string;
  userAvatar?: string;
  content: string;
  likes: number;
  replies: number;
  tips: number;
  time: string;
  timeAgo: string;
  imageUrl?: string;
  videoUrl?: string;
  linkPreview?: {
    url: string;
    title: string;
    description: string;
    image: string;
  };
  category?: string;
  subcategory?: string;
  isPremium?: boolean;
  isShoutout?: boolean;
  gameData?: any;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<number>>(new Set());
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySortType, setReplySortType] = useState<'best' | 'recent'>('best');

  const currentUserWallet = publicKey?.toBase58() || '';

  useEffect(() => {
    if (!connected) {
      router.push('/welcome');
      return;
    }
    loadPost();
  }, [postId, connected, router]);

  const loadPost = async () => {
    try {
      setLoading(true);

      // Mock data for now - replace with actual API call
      const mockPost: Post = {
        id: parseInt(postId),
        user: 'cryptodev.sol',
        userWallet: '7xKXtg2CW87d9wz9X9V1kZ2N5v7W3rQ2K1',
        userAvatar: '🚀',
        content: `This is a detailed post with ID ${postId}. It contains some interesting content about blockchain technology and the future of decentralized applications.

What do you think about the current state of Web3 development? 🤔

#blockchain #web3 #solana`,
        likes: 42,
        replies: 8,
        tips: 3,
        time: '2024-01-15T10:30:00Z',
        timeAgo: '2h',
        category: 'Technology',
        subcategory: 'Blockchain',
        isPremium: true,
        imageUrl: Math.random() > 0.5 ? 'https://picsum.photos/600/400?random=' + postId : undefined,
      };

      const mockReplies: Reply[] = [
        {
          id: 1,
          user: 'alice.sol',
          userWallet: '8yLXtg3DW98e9xy0A9W2lZ3O6v8X4sR3L2',
          userAvatar: '🎨',
          content: 'Great points! I especially agree with your thoughts on decentralization.',
          likes: 12,
          tips: 1,
          time: '2024-01-15T11:15:00Z',
          timeAgo: '1h',
          isPremium: false,
        },
        {
          id: 2,
          user: 'bob.sol',
          userWallet: '9zMXug4EX09f0yz1B0X3mZ4P7v9Y5tS4M3',
          userAvatar: '⚡',
          content: 'The future is definitely bright for Web3! Thanks for sharing your insights.',
          likes: 8,
          tips: 0,
          time: '2024-01-15T11:45:00Z',
          timeAgo: '30m',
          isPremium: true,
        },
        {
          id: 3,
          user: 'charlie.sol',
          userWallet: '0aNXvh5FY10g1z92C1Y4nZ5Q8w0Z6uT5N4',
          userAvatar: '🌟',
          content: 'This deserves more attention! 🔥',
          likes: 5,
          tips: 0,
          time: '2024-01-15T12:00:00Z',
          timeAgo: '15m',
          isPremium: false,
        },
      ];

      setPost(mockPost);
      setReplies(mockReplies);
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (!post) return;
    setLiked(!liked);
    setPost({
      ...post,
      likes: liked ? post.likes - 1 : post.likes + 1
    });
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
    setReplies(replies.map(reply =>
      reply.id === replyId
        ? { ...reply, likes: isLiked ? reply.likes - 1 : reply.likes + 1 }
        : reply
    ));
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !connected) return;

    setSubmittingReply(true);
    try {
      // Mock reply submission - replace with actual API call
      const newReply: Reply = {
        id: replies.length + 1,
        user: 'you.sol',
        userWallet: currentUserWallet,
        userAvatar: '🎮',
        content: replyContent,
        likes: 0,
        tips: 0,
        time: new Date().toISOString(),
        timeAgo: 'now',
        isPremium: false,
      };

      setReplies([...replies, newReply]);
      setReplyContent('');
      setShowReplyModal(false);

      if (post) {
        setPost({ ...post, replies: post.replies + 1 });
      }
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;

    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(urlRegex)) {
        return (
          <a
            key={index}
            href={word}
            target="_blank"
            rel="noopener noreferrer"
            className="text-korus-primary underline hover:text-korus-secondary"
          >
            {word}
          </a>
        );
      } else if (word.match(hashtagRegex)) {
        return (
          <span key={index} className="text-korus-primary hover:underline cursor-pointer">
            {word}
          </span>
        );
      } else if (word.match(mentionRegex)) {
        return (
          <span key={index} className="text-korus-secondary hover:underline cursor-pointer">
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
  };

  if (!connected) {
    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
        </div>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px] animate-float" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px] animate-float-delayed" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-korus-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white">Loading post...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-korus-dark-100 relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-korus-dark-100 via-korus-dark-200 to-korus-dark-100">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-korus-dark-300/25 to-korus-dark-200/35" />
        </div>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px] animate-float" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px] animate-float-delayed" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Post Not Found</h2>
            <p className="text-korus-textTertiary mb-8">The post you're looking for doesn't exist or has been removed.</p>
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

      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px] animate-float" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-korus-primary/4 to-korus-secondary/4 rounded-full blur-[60px] animate-pulse-slow" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Main Content Container with sidebar layout */}
        <div className="flex min-h-screen">
          {/* Main Content */}
          <div className="flex-1 lg:ml-80 lg:mr-96 md:ml-64 md:mr-80 sm:ml-0 sm:mr-0 md:border-x md:border-korus-border bg-korus-surface/10 backdrop-blur-sm max-w-full overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-korus-dark-300/80 backdrop-blur-xl border-b border-korus-border z-10">
              <div className="flex items-center px-4 py-4">
                <button className="md:hidden flex items-center justify-center w-12 h-12 text-white hover:bg-korus-surface/20 transition-colors mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-korus-surface/20 rounded-full transition-colors mr-3"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-white">Post</h1>
              </div>
            </div>

            {/* Post Content */}
            <div className="p-6">
              {/* Main Post */}
              <div className="bg-korus-surface/30 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-6 mb-6">
                {/* Post Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-lg font-bold text-black flex-shrink-0 shadow-lg shadow-korus-primary/20">
                    {post.userAvatar || post.userWallet.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button className="text-white font-semibold hover:text-korus-primary transition-colors">
                        {post.user}
                      </button>
                      {post.isPremium && (
                        <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                      )}
                      <span className="text-korus-textTertiary text-sm">{post.timeAgo}</span>
                    </div>
                    <p className="text-korus-textTertiary text-sm font-mono">{post.userWallet}</p>
                  </div>
                </div>

                {/* Post Content */}
                <div className="mb-6">
                  <div className="text-white text-lg leading-relaxed whitespace-pre-wrap mb-4">
                    {renderTextWithLinks(post.content)}
                  </div>

                  {/* Category */}
                  {post.category && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs bg-korus-primary/20 text-korus-primary px-2 py-1 rounded-full">
                        {post.category}
                      </span>
                      {post.subcategory && (
                        <span className="text-xs bg-korus-surface/40 text-korus-textSecondary px-2 py-1 rounded-full">
                          {post.subcategory}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Image */}
                  {post.imageUrl && (
                    <div className="mb-4">
                      <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="w-full rounded-xl max-h-96 object-cover border border-korus-borderLight"
                      />
                    </div>
                  )}

                  {/* Video */}
                  {post.videoUrl && (
                    <div className="mb-4">
                      <video
                        src={post.videoUrl}
                        controls
                        className="w-full rounded-xl max-h-96 border border-korus-borderLight"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {/* Link Preview */}
                  {post.linkPreview && (
                    <div className="mb-4 border border-korus-borderLight rounded-xl overflow-hidden bg-korus-surface/20">
                      <img src={post.linkPreview.image} alt="" className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-1">{post.linkPreview.title}</h3>
                        <p className="text-korus-textTertiary text-sm mb-2">{post.linkPreview.description}</p>
                        <a href={post.linkPreview.url} className="text-korus-primary text-sm hover:underline">
                          {post.linkPreview.url}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Post Stats */}
                <div className="flex items-center gap-6 text-korus-textTertiary text-sm mb-4">
                  <span>{post.likes} likes</span>
                  <span>{post.replies} replies</span>
                  <span>{post.tips} tips</span>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-korus-borderLight">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 ${
                      liked ? 'text-red-400' : 'text-korus-textTertiary'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    <span>Like</span>
                  </button>
                  <button
                    onClick={() => setShowReplyModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span>Reply</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                    <span>Tip</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Replies Section */}
              <div className="space-y-4">
                {/* Replies Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Replies ({replies.length})</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-korus-textTertiary">Sort by:</span>
                    <select
                      value={replySortType}
                      onChange={(e) => setReplySortType(e.target.value as 'best' | 'recent')}
                      className="bg-korus-surface/40 border border-korus-borderLight rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-korus-border"
                    >
                      <option value="best">Best</option>
                      <option value="recent">Recent</option>
                    </select>
                  </div>
                </div>

                {/* Replies List */}
                {replies.length === 0 ? (
                  <div className="text-center py-12 bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl">
                    <p className="text-korus-textTertiary">No replies yet. Be the first to reply!</p>
                  </div>
                ) : (
                  replies.map((reply) => (
                    <div key={reply.id} className="bg-korus-surface/20 backdrop-blur-sm border border-korus-borderLight rounded-2xl p-4 hover:border-korus-border transition-all">
                      {/* Reply Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-korus-primary to-korus-secondary rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0 shadow-lg shadow-korus-primary/20">
                          {reply.userAvatar || reply.userWallet.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button className="text-white font-semibold hover:text-korus-primary transition-colors">
                              {reply.user}
                            </button>
                            {reply.isPremium && (
                              <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              </div>
                            )}
                            <span className="text-korus-textTertiary text-sm">{reply.timeAgo}</span>
                          </div>
                          <p className="text-white mt-1">{renderTextWithLinks(reply.content)}</p>
                        </div>
                      </div>

                      {/* Reply Actions */}
                      <div className="flex items-center gap-4 ml-13">
                        <button
                          onClick={() => handleLikeReply(reply.id)}
                          className={`flex items-center gap-1 text-sm hover:text-red-400 transition-colors ${
                            likedReplies.has(reply.id) ? 'text-red-400' : 'text-korus-textTertiary'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={likedReplies.has(reply.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                          </svg>
                          <span>{reply.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-sm text-korus-textTertiary hover:text-blue-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                          </svg>
                          <span>Reply</span>
                        </button>
                        <button className="flex items-center gap-1 text-sm text-korus-textTertiary hover:text-korus-primary transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                          </svg>
                          <span>{reply.tips}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-korus-surface/90 backdrop-blur-xl border border-korus-borderLight rounded-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Reply to {post.user}</h3>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="p-2 hover:bg-korus-surface/20 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="w-full bg-korus-surface/40 border border-korus-borderLight rounded-xl p-4 text-white placeholder-korus-textTertiary resize-none focus:outline-none focus:border-korus-border"
                rows={4}
                maxLength={500}
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-korus-textTertiary">
                  {replyContent.length}/500 characters
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 border border-korus-borderLight rounded-lg text-korus-textTertiary hover:border-korus-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || submittingReply || !connected}
                    className="bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-bold px-6 py-2 rounded-lg disabled:opacity-50 hover:shadow-lg hover:shadow-korus-primary/30 transition-all"
                  >
                    {submittingReply ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LeftSidebar />
      <RightSidebar />
    </main>
  );
}