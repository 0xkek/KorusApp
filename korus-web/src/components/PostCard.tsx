'use client';

import { useState, memo } from 'react';
import type { Post } from '@/types';
import { SafeContent } from '@/components/SafeContent';

interface PostCardProps {
  post: Post;
}

const PostCardComponent = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <div className="bg-[#141414] border border-[#1a1a1a] rounded-xl p-4 mb-4 hover:border-korus-primary/20 transition-all duration-150">
      {/* Post Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-korus-primary to-korus-secondary flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{post.user}</span>
            <span className="text-[#a1a1a1] text-sm flex-shrink-0">{post.time}</span>
          </div>
          <SafeContent
            content={post.content}
            as="p"
            className="text-gray-300 mt-2 whitespace-pre-wrap break-words"
            allowLinks={true}
            allowFormatting={true}
          />
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[#1a1a1a] text-[#a1a1a1]">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 hover:text-korus-primary transition-colors ${
            liked ? 'text-korus-primary' : ''
          }`}
          aria-label={liked ? `Unlike post (${likes} likes)` : `Like post (${likes} likes)`}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likes}</span>
        </button>
        <button
          className="flex items-center gap-2 hover:text-korus-primary transition-colors"
          aria-label={`View ${post.replies} replies`}
        >
          <span>💬</span>
          <span>{post.replies}</span>
        </button>
        <button
          className="flex items-center gap-2 hover:text-korus-primary transition-colors"
          aria-label={`Tip ${post.tips} SOL`}
        >
          <span>💰</span>
          <span>{post.tips} SOL</span>
        </button>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
// Only re-renders when post data actually changes
export const PostCard = memo(PostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.replies === nextProps.post.replies &&
    prevProps.post.content === nextProps.post.content
  );
});
