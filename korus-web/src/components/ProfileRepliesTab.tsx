'use client';

import Link from 'next/link';
import { SafeContent } from '@/components/SafeContent';
import { formatRelativeTime } from '@/utils/formatTime';

interface ProfileRepliesTabProps {
  isLoading: boolean;
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    likeCount: number;
    postId: string;
    postContent?: string;
    postAuthor?: string;
  }>;
}

export default function ProfileRepliesTab({ isLoading, replies }: ProfileRepliesTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-6 h-6 border-2 border-[var(--korus-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--color-text-tertiary)] text-[15px]">No replies yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#262626]/50">
      {replies.map((reply) => (
        <Link
          key={reply.id}
          href={`/post/${reply.postId}`}
          className="block p-4 hover:bg-white/[0.02] transition-all"
        >
          {reply.postContent && (
            <div className="text-[var(--color-text-tertiary)] text-[12px] mb-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Replying to {reply.postAuthor ? `@${reply.postAuthor}` : 'a post'}
            </div>
          )}
          <SafeContent
            content={reply.content}
            as="p"
            className="text-[var(--color-text)] text-[15px] mb-2"
            allowLinks={true}
            allowFormatting={true}
          />
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-tertiary)] text-[13px]">{reply.likeCount} likes</span>
            <span className="text-[var(--color-text-tertiary)] text-[12px]">
              {formatRelativeTime(reply.createdAt)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
