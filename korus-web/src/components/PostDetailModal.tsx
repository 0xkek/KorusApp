'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';

interface Post {
  id: number;
  user: string;
  content: string;
  likes: number;
  replies: number;
  tips: number;
  time: string;
  isPremium?: boolean;
  isShoutout?: boolean;
  isRepost?: boolean;
  repostedBy?: string;
  image?: string;
  video?: string;
  originalId?: number;
}

interface Reply {
  id: number;
  user: string;
  content: string;
  likes: number;
  replies: number;
  time: string;
  isPremium?: boolean;
}

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  postId?: number;
  onLike?: (postId: number) => void;
  onRepost?: (postId: number) => void;
  onTip?: (user: string, postId: number) => void;
  onShare?: (post: Post) => void;
  onReply?: (post: Post) => void;
  likedPosts?: Set<number>;
  repostedPosts?: Set<number>;
}

export default function PostDetailModal({
  isOpen,
  onClose,
  post,
  postId,
  onLike,
  onRepost,
  onTip,
  onShare,
  onReply,
  likedPosts = new Set(),
  repostedPosts = new Set()
}: PostDetailModalProps) {
  const { connected } = useWallet();
  const router = useRouter();
  const [replies, setReplies] = useState<Reply[]>([]);

  // Mock replies data
  useEffect(() => {
    if (isOpen && post) {
      // Simulate loading replies
      const mockReplies: Reply[] = [
        {
          id: 1,
          user: 'alice.sol',
          content: 'Great point! I totally agree with this perspective.',
          likes: 5,
          replies: 1,
          time: '1h',
          isPremium: false,
        },
        {
          id: 2,
          user: 'bob.sol',
          content: 'This is exactly what the community needs to hear. Thanks for sharing!',
          likes: 8,
          replies: 0,
          time: '45m',
          isPremium: true,
        },
        {
          id: 3,
          user: 'crypto_dev',
          content: 'Interesting take. Have you considered the implications for DeFi protocols?',
          likes: 12,
          replies: 2,
          time: '30m',
          isPremium: false,
        },
      ];
      setReplies(mockReplies);

      // Update URL for sharing
      if (postId) {
        const newUrl = `/post/${postId}`;
        window.history.pushState({}, '', newUrl);
      }
    }
  }, [isOpen, post, postId]);

  // Handle modal close and URL cleanup
  const handleClose = () => {
    // Restore previous URL
    window.history.back();
    onClose();
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Modal Container */}
      <div className="bg-korus-surface/90 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] mx-4 border border-korus-border shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="sticky top-0 bg-korus-surface/90 backdrop-blur-md flex items-center justify-between p-4 border-b border-korus-border">
          <h2 className="heading-2 text-white">Post</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-korus-surface/40 border border-korus-borderLight text-korus-textSecondary hover:bg-korus-surface/60 hover:text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
          {/* Repost Header */}
          {post.isRepost && (
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center gap-2 text-korus-textSecondary text-sm">
                <svg className="w-4 h-4 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>
                  <span className="text-korus-text font-medium">{post.repostedBy}</span> reposted
                </span>
              </div>
            </div>
          )}

          {/* Main Post */}
          <div className="p-6 border-b border-korus-border">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
                {post.user.slice(0, 2).toUpperCase()}
              </div>

              {/* Post Content */}
              <div className="flex-1 min-w-0">
                {/* Post Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-white">{post.user}</span>
                  {post.isPremium && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD700' }}>
                      <svg className="w-3 h-3" fill="black" viewBox="0 0 24 24">
                        <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                      </svg>
                    </div>
                  )}
                  <span className="text-korus-textSecondary">@{post.user}</span>
                  <span className="text-korus-textSecondary">·</span>
                  <span className="text-korus-textSecondary">{post.time}</span>
                </div>

                {/* Post Text */}
                <div className="text-white text-lg leading-relaxed mb-4 whitespace-pre-wrap break-words">
                  {post.content}
                </div>

                {/* Post Image */}
                {post.image && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-korus-border">
                    <img src={post.image} alt="Post content" className="w-full h-auto" />
                  </div>
                )}

                {/* Post Stats */}
                <div className="flex items-center gap-6 text-korus-textSecondary text-sm mb-4 py-3 border-y border-korus-borderLight">
                  <span className="flex items-center gap-1">
                    <strong className="text-white">{post.replies}</strong>
                    <span>Replies</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <strong className="text-white">{12 + (repostedPosts.has(post.originalId || post.id) ? 1 : 0)}</strong>
                    <span>Reposts</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <strong className="text-white">{post.likes + (likedPosts.has(post.id) ? 1 : 0)}</strong>
                    <span>Likes</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <strong className="text-white">{post.tips}</strong>
                    <span>SOL Tips</span>
                  </span>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between max-w-md">
                  <button
                    onClick={() => onReply?.(post)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                  >
                    <svg className="w-5 h-5 text-korus-textTertiary group-hover:text-korus-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm font-medium text-korus-textTertiary group-hover:text-korus-primary transition-colors">Reply</span>
                  </button>

                  <button
                    onClick={() => onRepost?.(post.originalId || post.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group ${
                      repostedPosts.has(post.originalId || post.id) ? 'bg-korus-primary/10 border-korus-primary/20' : ''
                    }`}
                  >
                    <svg className={`w-5 h-5 transition-colors ${
                      repostedPosts.has(post.originalId || post.id) ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className={`text-sm font-medium transition-colors ${
                      repostedPosts.has(post.originalId || post.id) ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                    }`}>Repost</span>
                  </button>

                  <button
                    onClick={() => onLike?.(post.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group ${
                      likedPosts.has(post.id) ? 'bg-korus-primary/15 border-korus-primary/40' : ''
                    }`}
                  >
                    <svg className={`w-5 h-5 transition-colors ${
                      likedPosts.has(post.id) ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                    }`} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className={`text-sm font-medium transition-colors ${
                      likedPosts.has(post.id) ? 'text-korus-primary' : 'text-korus-textTertiary group-hover:text-korus-primary'
                    }`}>Like</span>
                  </button>

                  <button
                    onClick={() => onTip?.(post.user, post.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                  >
                    <svg className="w-5 h-5 text-korus-textTertiary group-hover:text-korus-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-korus-textTertiary group-hover:text-korus-primary transition-colors">Tip</span>
                  </button>

                  <button
                    onClick={() => onShare?.(post)}
                    className="flex items-center justify-center w-9 h-9 rounded-full text-korus-textTertiary border border-transparent hover:bg-korus-surface/40 hover:border-korus-borderLight transition-all duration-200 group"
                  >
                    <svg className="w-5 h-5 text-korus-textTertiary group-hover:text-korus-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <div className="px-6 py-4">
            <h3 className="text-lg font-bold text-white mb-4">Replies</h3>

            {replies.length === 0 ? (
              <div className="text-center py-8 text-korus-textSecondary">
                <svg className="w-12 h-12 mx-auto mb-4 text-korus-textTertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-korus-textSecondary">No replies yet</p>
                <p className="text-korus-textTertiary text-sm mt-1">Be the first to reply!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="flex gap-3 p-4 rounded-xl bg-korus-surface/20 border border-korus-borderLight hover:border-korus-border transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-sm font-bold text-black flex-shrink-0">
                      {reply.user.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white text-sm">{reply.user}</span>
                        {reply.isPremium && (
                          <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
                            </svg>
                          </div>
                        )}
                        <span className="text-korus-textSecondary text-sm">@{reply.user}</span>
                        <span className="text-korus-textSecondary text-sm">·</span>
                        <span className="text-korus-textSecondary text-sm">{reply.time}</span>
                      </div>
                      <p className="text-white text-sm leading-relaxed mb-2">{reply.content}</p>
                      <div className="flex items-center gap-4 text-korus-textSecondary text-xs">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {reply.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {reply.replies}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}