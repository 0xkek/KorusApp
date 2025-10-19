/**
 * Feed Data Hook
 * Handles posts fetching, loading states, and post CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { postsAPI } from '@/lib/api';
import { MOCK_POSTS } from '@/data/mockData';
import type { Post } from '@/types';

interface ShoutoutQueueInfo {
  activeShoutout: {
    id: string;
    duration: number;
    expiresAt: Date | string;
    content: string;
  } | null;
  queuedShoutouts: Array<{
    id: string;
    duration: number;
    expiresAt: Date | string;
    content: string;
  }>;
}

export function useFeedData() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shoutoutQueueInfo, setShoutoutQueueInfo] = useState<ShoutoutQueueInfo>({
    activeShoutout: null,
    queuedShoutouts: [],
  });

  // Fetch posts function
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to fetch from backend API
      const response = await postsAPI.getPosts();

      // If we got posts from the backend, use them
      if (response.posts && response.posts.length > 0) {
        // Transform backend posts to match frontend format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPosts = response.posts.map((post: any) => ({
          ...post,
          user: post.author?.username || post.author?.snsUsername || post.authorWallet?.slice(0, 15) || 'Unknown',
          wallet: post.authorWallet,
          userTheme: post.author?.themeColor,
          time: new Date(post.createdAt).toLocaleString(),
          likes: post.likeCount || 0,
          comments: post.replyCount || 0,
          reposts: post.repostCount || 0,
          tips: Number(post.tipAmount) || 0,
          image: post.imageUrl,
          avatar: post.author?.nftAvatar || null,
          isPremium: post.author?.tier === 'premium',
          shoutoutExpiresAt: post.shoutoutExpiresAt,
          // Map originalPost to repostedPost for reposts
          repostedPost: post.isRepost && post.originalPost ? {
            id: post.originalPost.id,
            user: post.originalPost.author?.username || post.originalPost.author?.snsUsername || post.originalPost.authorWallet?.slice(0, 15) || 'Unknown',
            wallet: post.originalPost.authorWallet,
            userTheme: post.originalPost.author?.themeColor,
            content: post.originalPost.content || '',
            likes: post.originalPost.likeCount || 0,
            replies: post.originalPost.replyCount || 0,
            tips: Number(post.originalPost.tipAmount) || 0,
            comments: post.originalPost.replyCount || 0,
            reposts: post.originalPost.repostCount || 0,
            time: new Date(post.originalPost.createdAt).toLocaleString(),
            isPremium: post.originalPost.author?.tier === 'premium',
            image: post.originalPost.imageUrl,
            avatar: post.originalPost.author?.nftAvatar || null,
          } : undefined,
        }));

        const sortedPosts = [...transformedPosts].sort((a, b) => {
          if (a.isShoutout && !b.isShoutout) return -1;
          if (!a.isShoutout && b.isShoutout) return 1;
          return 0;
        });
        setPosts(sortedPosts as Post[]);

        // Update shoutout queue state from backend response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((response as any).shoutoutQueue) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const queueData = (response as any).shoutoutQueue;
          logger.log('Shoutout queue data:', queueData);
          setShoutoutQueueInfo({
            activeShoutout: queueData.active,
            queuedShoutouts: queueData.queued || []
          });
        }
      } else {
        // Fallback to mock data if backend returns empty
        logger.log('No posts in database, using mock data as fallback');
        const mockPosts = [...MOCK_POSTS].sort((a, b) => {
          if (a.isShoutout && !b.isShoutout) return -1;
          if (!a.isShoutout && b.isShoutout) return 1;
          return 0;
        });
        setPosts(mockPosts);
      }
    } catch (err) {
      logger.error('Failed to fetch posts from backend:', err);
      logger.log('Using mock data as fallback');
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
      setError(errorMessage);

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
  }, []);

  // Initialize posts when component mounts
  useEffect(() => {
    if (posts.length === 0) {
      fetchPosts();
    }
  }, [posts.length, fetchPosts]);

  // Add a new post to the feed
  const addPost = useCallback((newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  }, []);

  // Update a post in the feed
  const updatePost = useCallback((postId: number, updates: Partial<Post>) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  }, []);

  // Remove a post from the feed
  const removePost = useCallback((postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return {
    posts,
    isLoading,
    error,
    shoutoutQueueInfo,
    fetchPosts,
    addPost,
    updatePost,
    removePost,
  };
}
