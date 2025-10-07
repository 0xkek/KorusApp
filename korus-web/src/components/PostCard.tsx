'use client';

import { useState } from 'react';

interface PostCardProps {
  post: {
    id: number;
    user: string;
    content: string;
    likes: number;
    replies: number;
    tips: number;
    time: string;
  };
}

export const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <div className="bg-korus-dark-300 border border-korus-dark-400 rounded-xl p-4 mb-4 hover:border-korus-primary/20 transition-all">
      {/* Post Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-korus-primary to-korus-secondary flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{post.user}</span>
            <span className="text-korus-textSecondary text-sm flex-shrink-0">{post.time}</span>
          </div>
          <p className="text-gray-300 mt-2 whitespace-pre-wrap break-words">{post.content}</p>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-korus-dark-400 text-korus-textSecondary">
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
