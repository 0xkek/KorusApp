'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Post } from '@/types';
import { SafeContent } from '@/components/SafeContent';
import LinkPreview from '@/components/LinkPreview';
import VideoPlayer from '@/components/VideoPlayer';
import { formatRelativeTime } from '@/utils/formatTime';

const ShoutoutCountdown = dynamic(() => import('@/components/ShoutoutCountdown'), { ssr: false });

// Helper function to extract URLs from text
const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

const truncateAddress = (address: string) => {
  if (!address || address.length <= 20) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export interface FeedPostCardProps {
  post: Post;
  interactions: { liked: boolean; reposted: boolean; replied: boolean; tipped: boolean } | undefined;
  currentWallet: string | null;
  userAvatar: string | null;
  inlineReplyPostId: string | number | null;
  inlineReplyText: string;
  isPostingInlineReply: boolean;
  onLike: (postId: string | number) => void;
  onRepost: (postId: string | number) => void;
  onTip: (post: Post) => void;
  onShare: (post: Post) => void;
  onOptions: (post: Post) => void;
  onReply: (postId: string | number) => void;
  onInlineReplyChange: (text: string) => void;
  onInlineReplySubmit: (post: Post) => void;
  onInlineReplyClose: () => void;
  onShoutoutExpire: (postId: string | number) => void;
  onNavigate: (postId: string | number) => void;
}

const FeedPostCardComponent = ({
  post,
  interactions,
  currentWallet,
  userAvatar,
  inlineReplyPostId,
  inlineReplyText,
  isPostingInlineReply,
  onLike,
  onRepost,
  onTip,
  onShare,
  onOptions,
  onReply,
  onInlineReplyChange,
  onInlineReplySubmit,
  onInlineReplyClose,
  onShoutoutExpire,
  onNavigate,
}: FeedPostCardProps) => {
  const inlineReplyRef = React.useRef<HTMLTextAreaElement>(null);
  const actionPostId = post.repostedPost?.id || post.id;
  const actionPost = post.repostedPost || post;

  return (
    <div
      className={`transition-colors cursor-pointer group ${
        post.isShoutout
          ? 'px-5 py-2'
          : 'px-5 py-4 border-b border-[var(--color-border-light)] hover:bg-white/[0.02]'
      }`}
      onClick={() => onNavigate(post.repostedPost?.id || post.id)}
    >
      {/* Shoutout Banner */}
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
                onExpire={() => onShoutoutExpire(post.id)}
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
          {(() => {
            const displayAvatar = post.repostedPost?.avatar || post.avatar;
            const displayUser = post.repostedPost?.user || post.user || 'Unknown';
            return displayAvatar ? (
              <div className="w-[42px] h-[42px] rounded-full flex-shrink-0 overflow-hidden">
                <Image
                  src={displayAvatar}
                  alt={`${displayUser} avatar`}
                  width={42}
                  height={42}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-[14px] font-bold text-black">${(displayUser || 'U').slice(0, 2).toUpperCase()}</div>`;
                  }}
                />
              </div>
            ) : (
              <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center text-[14px] font-bold text-black flex-shrink-0">
                {(displayUser || 'U').slice(0, 2).toUpperCase()}
              </div>
            );
          })()}

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

            {post.isSponsored && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 ml-2">
                Sponsored
              </span>
            )}

            <div className="ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOptions(post);
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

        {/* Post Body */}
        <div className="ml-[52px] mt-0.5">
          {(post.repostedPost?.content || post.content) && (
            <SafeContent
              content={post.repostedPost?.content || post.content}
              className="text-[15px] leading-[1.55] text-[#e5e5e5] whitespace-pre-wrap break-words"
              allowLinks={true}
              allowFormatting={true}
            />
          )}

          {extractUrls(post.repostedPost?.content || post.content).map((url, index) => (
            <div key={index} className="mb-3">
              <LinkPreview url={url} />
            </div>
          ))}

          {post.video && (
            <div className="mb-3">
              <VideoPlayer videoUrl={post.video} />
            </div>
          )}

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
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-0.5 mt-3 -ml-2">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                interactions?.replied
                  ? 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onReply(actionPostId);
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{actionPost.comments ?? actionPost.replies ?? 0}</span>
            </button>

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 hover:bg-red-500/10"
              style={{ color: interactions?.liked ? '#ef4444' : '#737373' }}
              onClick={(e) => {
                e.stopPropagation();
                onLike(actionPostId);
                if (typeof window !== 'undefined' && 'createParticleExplosion' in window) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = rect.left + rect.width / 2;
                  const y = rect.top + rect.height / 2;
                  (window as Window & { createParticleExplosion: (type: string, x: number, y: number) => void }).createParticleExplosion('like', x, y);
                }
              }}
            >
              <svg className="w-[18px] h-[18px]" fill={interactions?.liked ? '#ef4444' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{actionPost.likes ?? 0}</span>
            </button>

            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                interactions?.reposted
                  ? 'text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--korus-primary)] hover:bg-[color-mix(in_srgb,var(--korus-primary)_8%,transparent)]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onRepost(actionPostId);
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{actionPost.reposts ?? 0}</span>
            </button>

            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] transition-all duration-150 ${
                interactions?.tipped
                  ? 'text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onTip(post.repostedPost || post);
              }}
            >
              <svg className={`w-[18px] h-[18px] ${interactions?.tipped ? 'text-[#f59e0b]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {actionPost.tips ? <span className={`text-[11px] font-semibold px-1.5 rounded-[6px] ${interactions?.tipped ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]' : 'bg-[color-mix(in_srgb,var(--korus-primary)_10%,transparent)] text-[var(--korus-primary)]'}`}>{actionPost.tips} SOL</span> : <span>Tip</span>}
            </button>

            <button
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.08] transition-all duration-150"
              onClick={(e) => {
                e.stopPropagation();
                onShare(post.repostedPost || post);
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {/* Inline Reply */}
          {inlineReplyPostId === actionPostId && (
            <div className="mt-3 flex gap-3" onClick={(e) => e.stopPropagation()}>
              {userAvatar ? (
                <div className="w-[32px] h-[32px] rounded-full flex-shrink-0 overflow-hidden">
                  <Image src={userAvatar} alt="You" width={32} height={32} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-korus-primary to-korus-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-black font-bold text-[10px]">{currentWallet?.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <textarea
                  ref={inlineReplyRef}
                  value={inlineReplyText}
                  onChange={(e) => onInlineReplyChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onInlineReplySubmit(post.repostedPost || post);
                    }
                    if (e.key === 'Escape') {
                      onInlineReplyClose();
                    }
                  }}
                  placeholder="Post your reply..."
                  className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[16px] px-3 py-2 text-[14px] text-[var(--color-text)] placeholder-[#525252] resize-none outline-none focus:border-[var(--korus-primary)]/50 transition-colors min-h-[36px] max-h-[120px]"
                  rows={1}
                />
                <button
                  onClick={() => onInlineReplySubmit(post.repostedPost || post)}
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
  );
};

// Custom areEqual to prevent unnecessary re-renders
function areEqual(prevProps: FeedPostCardProps, nextProps: FeedPostCardProps): boolean {
  const pp = prevProps.post;
  const np = nextProps.post;

  if (pp.id !== np.id) return false;
  if (pp.likes !== np.likes) return false;
  if (pp.comments !== np.comments) return false;
  if (pp.reposts !== np.reposts) return false;
  if (pp.tips !== np.tips) return false;

  // Interaction state
  const pi = prevProps.interactions;
  const ni = nextProps.interactions;
  if (pi?.liked !== ni?.liked) return false;
  if (pi?.reposted !== ni?.reposted) return false;
  if (pi?.replied !== ni?.replied) return false;
  if (pi?.tipped !== ni?.tipped) return false;

  // Inline reply visibility
  const prevIsReply = prevProps.inlineReplyPostId === (pp.repostedPost?.id || pp.id);
  const nextIsReply = nextProps.inlineReplyPostId === (np.repostedPost?.id || np.id);
  if (prevIsReply !== nextIsReply) return false;
  if (nextIsReply && prevProps.inlineReplyText !== nextProps.inlineReplyText) return false;
  if (nextIsReply && prevProps.isPostingInlineReply !== nextProps.isPostingInlineReply) return false;

  return true;
}

export const FeedPostCard = memo(FeedPostCardComponent, areEqual);
