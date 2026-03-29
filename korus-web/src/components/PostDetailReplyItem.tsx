'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SafeContent } from '@/components/SafeContent';
import { formatRelativeTime } from '@/utils/formatTime';
import type { Reply } from '@/types';

// Truncate wallet address for display
const truncateAddress = (address: string) => {
  if (!address || address.length <= 20) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export interface PostDetailReplyItemProps {
  reply: Reply;
  level?: number;
  likedReplies: Set<string | number>;
  tippedReplies: Set<string | number>;
  onReply: (reply: Reply) => void;
  onLikeReply: (replyId: number | string) => void;
  onTipReply: (reply: Reply) => void;
  onShareReply: (reply: Reply) => void;
  onReportReply: (reply: Reply) => void;
  onToggleExpansion: (replyId: string | number) => void;
}

export default function PostDetailReplyItem({
  reply,
  level = 0,
  likedReplies,
  tippedReplies,
  onReply,
  onLikeReply,
  onTipReply,
  onShareReply,
  onReportReply,
  onToggleExpansion,
}: PostDetailReplyItemProps) {
  const hasReplies = reply.replies && reply.replies.length > 0;

  return (
    <div key={reply.id}>
      {/* Reply Content */}
      <div className="px-4 py-3 border-b border-[var(--color-border-light)] flex gap-3 hover:bg-white/[0.04] transition-colors duration-150">
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
              className="font-semibold text-sm text-[var(--color-text)] hover:underline"
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
            <span className="text-[13px] text-[var(--color-text-secondary)]">@{truncateAddress(reply.user)}</span>
            <span className="text-[var(--color-text-tertiary)]">&middot;</span>
            <span className="text-[13px] text-[var(--color-text-tertiary)]">{reply.createdAt ? formatRelativeTime(reply.createdAt) : reply.time}</span>
          </div>

          {/* Content */}
          <SafeContent
            content={reply.content}
            className="text-[var(--color-text)] text-sm leading-[1.5] mb-2 whitespace-pre-wrap break-words"
            allowLinks={true}
            allowFormatting={true}
          />

          {/* Actions */}
          <div className="flex items-center gap-0.5 mt-2 -ml-2">
            <button
              onClick={() => onReply(reply)}
              aria-label="Reply to comment"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[var(--color-text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              {hasReplies && <span className="text-xs font-medium">{reply.replies.length}</span>}
            </button>

            <button
              onClick={() => onLikeReply(reply.id)}
              aria-label={likedReplies.has(reply.id) ? "Unlike reply" : "Like reply"}
              className="flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150 hover:bg-red-500/10"
              style={{ color: likedReplies.has(reply.id) ? '#ef4444' : '#a1a1a1' }}
            >
              <svg className="w-4 h-4" fill={likedReplies.has(reply.id) ? '#ef4444' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <span className="text-xs font-medium">{reply.likes}</span>
            </button>

            <button
              onClick={() => onTipReply(reply)}
              aria-label="Send tip (0 SOL)"
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150 ${
                tippedReplies.has(String(reply.id))
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : 'text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <span className="text-xs font-medium">$</span>
              <span className="text-xs font-medium">0 SOL</span>
            </button>

            <button
              onClick={() => onShareReply(reply)}
              aria-label="Share reply"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[var(--color-text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>

            {/* Report/Options button */}
            <button
              onClick={() => onReportReply(reply)}
              aria-label="More options"
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/[0.08] transition-all duration-150 ml-auto"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
          </div>

          {/* Show replies toggle */}
          {hasReplies && (
            <button
              onClick={() => onToggleExpansion(reply.id)}
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
          {reply.replies.map(nestedReply => (
            <PostDetailReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              level={level + 1}
              likedReplies={likedReplies}
              tippedReplies={tippedReplies}
              onReply={onReply}
              onLikeReply={onLikeReply}
              onTipReply={onTipReply}
              onShareReply={onShareReply}
              onReportReply={onReportReply}
              onToggleExpansion={onToggleExpansion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
