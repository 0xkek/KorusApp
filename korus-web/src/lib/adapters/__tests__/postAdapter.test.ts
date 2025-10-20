/**
 * Tests for Post Adapter
 * Tests data transformation from backend API types to frontend UI types
 */

import {
  apiPostToPost,
  apiReplyToReply,
  apiPostsToPost,
  apiRepliesToReplies,
} from '../postAdapter';
import { APIPost, APIReply, APIAuthor } from '@/types/api';

describe('postAdapter', () => {
  // Mock data
  const mockAuthor: APIAuthor = {
    id: 1,
    walletAddress: '7xKVa1234567890abcdefghijklmnopqrstuvwxyz',
    username: 'testuser',
    snsUsername: 'test.sol',
    tier: 'free',
    nftAvatar: 'https://example.com/avatar.png',
    themeColor: '#FF6B00',
  };

  const mockPremiumAuthor: APIAuthor = {
    ...mockAuthor,
    id: 2,
    username: 'premiumuser',
    tier: 'premium',
  };

  const mockApiPost: APIPost = {
    id: 123,
    content: 'Test post content',
    authorWallet: mockAuthor.walletAddress,
    author: mockAuthor,
    likeCount: 42,
    replyCount: 10,
    repostCount: 5,
    tipAmount: '1.5',
    tipCount: 3,
    createdAt: new Date().toISOString(),
    isShoutout: false,
    isRepost: false,
    topic: 'gaming',
    subtopic: 'fps',
    imageUrl: 'https://example.com/image.jpg',
    videoUrl: null,
    shoutoutDuration: null,
    shoutoutExpiresAt: null,
    originalPost: null,
  };

  describe('apiPostToPost', () => {
    it('should transform basic post correctly', () => {
      const result = apiPostToPost(mockApiPost);

      expect(result.id).toBe(123);
      expect(result.user).toBe('testuser');
      expect(result.wallet).toBe(mockAuthor.walletAddress);
      expect(result.content).toBe('Test post content');
      expect(result.likes).toBe(42);
      expect(result.replies).toBe(10);
      expect(result.comments).toBe(10);
      expect(result.reposts).toBe(5);
      expect(result.tips).toBe(1.5);
      expect(result.tipCount).toBe(3);
      expect(result.isPremium).toBe(false);
      expect(result.isShoutout).toBe(false);
      expect(result.isRepost).toBe(false);
      expect(result.category).toBe('gaming');
      expect(result.subcategory).toBe('fps');
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle premium user correctly', () => {
      const premiumPost: APIPost = {
        ...mockApiPost,
        author: mockPremiumAuthor,
      };

      const result = apiPostToPost(premiumPost);

      expect(result.isPremium).toBe(true);
      expect(result.user).toBe('premiumuser');
    });

    it('should handle missing author with fallback to wallet', () => {
      const postWithoutAuthor: APIPost = {
        ...mockApiPost,
        author: undefined,
      };

      const result = apiPostToPost(postWithoutAuthor);

      expect(result.user).toBe('7xKVa1234567890...'); // Truncated wallet
    });

    it('should prefer username over snsUsername', () => {
      const result = apiPostToPost(mockApiPost);
      expect(result.user).toBe('testuser');
    });

    it('should use snsUsername when username is missing', () => {
      const postWithSNS: APIPost = {
        ...mockApiPost,
        author: {
          ...mockAuthor,
          username: undefined,
        },
      };

      const result = apiPostToPost(postWithSNS);
      expect(result.user).toBe('test.sol');
    });

    it('should handle string ID and convert to number', () => {
      const postWithStringId: APIPost = {
        ...mockApiPost,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: '456' as any,
      };

      const result = apiPostToPost(postWithStringId);
      expect(result.id).toBe(456);
      expect(typeof result.id).toBe('number');
    });

    it('should handle missing optional fields with defaults', () => {
      const minimalPost: APIPost = {
        id: 1,
        content: 'Minimal post',
        authorWallet: mockAuthor.walletAddress,
        author: mockAuthor,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        tipAmount: '0',
        tipCount: 0,
        isShoutout: false,
        isRepost: false,
        topic: 'gaming',
        subtopic: null,
        imageUrl: null,
        videoUrl: null,
        shoutoutDuration: null,
        shoutoutExpiresAt: null,
        originalPost: null,
      };

      const result = apiPostToPost(minimalPost);

      expect(result.likes).toBe(0);
      expect(result.replies).toBe(0);
      expect(result.tips).toBe(0);
      expect(result.imageUrl).toBeNull();
      expect(result.videoUrl).toBeNull();
    });

    it('should handle shoutout posts', () => {
      const shoutoutPost: APIPost = {
        ...mockApiPost,
        isShoutout: true,
        shoutoutDuration: 24,
        shoutoutExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = apiPostToPost(shoutoutPost);

      expect(result.isShoutout).toBe(true);
      expect(result.shoutoutDuration).toBe(24);
      expect(result.shoutoutExpiresAt).toBeTruthy();
    });

    it('should recursively transform reposted post', () => {
      const originalPost: APIPost = {
        ...mockApiPost,
        id: 999,
        content: 'Original post',
      };

      const repost: APIPost = {
        ...mockApiPost,
        id: 123,
        isRepost: true,
        originalPost: originalPost,
        content: 'Repost with comment',
      };

      const result = apiPostToPost(repost);

      expect(result.isRepost).toBe(true);
      expect(result.repostedPost).toBeDefined();
      expect(result.repostedPost?.id).toBe(999);
      expect(result.repostedPost?.content).toBe('Original post');
    });

    it('should handle null/undefined content', () => {
      const postWithoutContent: APIPost = {
        ...mockApiPost,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: null as any,
      };

      const result = apiPostToPost(postWithoutContent);
      expect(result.content).toBe('');
    });

    it('should convert tipAmount string to number', () => {
      const postWithTips: APIPost = {
        ...mockApiPost,
        tipAmount: '12.5',
      };

      const result = apiPostToPost(postWithTips);
      expect(result.tips).toBe(12.5);
      expect(typeof result.tips).toBe('number');
    });
  });

  describe('apiReplyToReply', () => {
    const mockApiReply: APIReply = {
      id: 456,
      postId: 123,
      authorWallet: mockAuthor.walletAddress,
      author: mockAuthor,
      content: 'Test reply content',
      likeCount: 5,
      childReplies: [],
      createdAt: new Date().toISOString(),
      imageUrl: null,
      videoUrl: null,
    };

    it('should transform basic reply correctly', () => {
      const result = apiReplyToReply(mockApiReply);

      expect(result.id).toBe(456);
      expect(result.postId).toBe(123);
      expect(result.user).toBe('testuser');
      expect(result.wallet).toBe(mockAuthor.walletAddress);
      expect(result.content).toBe('Test reply content');
      expect(result.likes).toBe(5);
      expect(result.isPremium).toBe(false);
      expect(result.replies).toEqual([]);
    });

    it('should handle premium user in reply', () => {
      const premiumReply: APIReply = {
        ...mockApiReply,
        author: mockPremiumAuthor,
      };

      const result = apiReplyToReply(premiumReply);
      expect(result.isPremium).toBe(true);
    });

    it('should recursively transform nested replies', () => {
      const childReply: APIReply = {
        ...mockApiReply,
        id: 789,
        content: 'Nested reply',
        childReplies: [],
      };

      const parentReply: APIReply = {
        ...mockApiReply,
        childReplies: [childReply],
      };

      const result = apiReplyToReply(parentReply);

      expect(result.replies).toHaveLength(1);
      expect(result.replies[0].id).toBe(789);
      expect(result.replies[0].content).toBe('Nested reply');
    });

    it('should handle string ID and convert to number', () => {
      const replyWithStringId: APIReply = {
        ...mockApiReply,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: '789' as any,
      };

      const result = apiReplyToReply(replyWithStringId);
      expect(result.id).toBe(789);
      expect(typeof result.id).toBe('number');
    });

    it('should handle reply with image', () => {
      const replyWithImage: APIReply = {
        ...mockApiReply,
        imageUrl: 'https://example.com/reply-image.jpg',
      };

      const result = apiReplyToReply(replyWithImage);
      expect(result.image).toBe('https://example.com/reply-image.jpg');
    });

    it('should handle reply with video', () => {
      const replyWithVideo: APIReply = {
        ...mockApiReply,
        videoUrl: 'https://example.com/reply-video.mp4',
      };

      const result = apiReplyToReply(replyWithVideo);
      expect(result.videoUrl).toBe('https://example.com/reply-video.mp4');
    });
  });

  describe('apiPostsToPost', () => {
    it('should transform array of posts', () => {
      const posts: APIPost[] = [
        { ...mockApiPost, id: 1, content: 'Post 1' },
        { ...mockApiPost, id: 2, content: 'Post 2' },
        { ...mockApiPost, id: 3, content: 'Post 3' },
      ];

      const result = apiPostsToPost(posts);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[0].content).toBe('Post 1');
      expect(result[1].id).toBe(2);
      expect(result[1].content).toBe('Post 2');
      expect(result[2].id).toBe(3);
      expect(result[2].content).toBe('Post 3');
    });

    it('should handle empty array', () => {
      const result = apiPostsToPost([]);
      expect(result).toEqual([]);
    });
  });

  describe('apiRepliesToReplies', () => {
    const mockReply: APIReply = {
      id: 1,
      postId: 123,
      authorWallet: mockAuthor.walletAddress,
      author: mockAuthor,
      content: 'Reply',
      likeCount: 0,
      childReplies: [],
      createdAt: new Date().toISOString(),
      imageUrl: null,
      videoUrl: null,
    };

    it('should transform array of replies', () => {
      const replies: APIReply[] = [
        { ...mockReply, id: 1, content: 'Reply 1' },
        { ...mockReply, id: 2, content: 'Reply 2' },
      ];

      const result = apiRepliesToReplies(replies);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].content).toBe('Reply 1');
      expect(result[1].id).toBe(2);
      expect(result[1].content).toBe('Reply 2');
    });

    it('should handle empty array', () => {
      const result = apiRepliesToReplies([]);
      expect(result).toEqual([]);
    });
  });

  describe('Time formatting', () => {
    it('should format time as "now" for recent posts', () => {
      const recentPost: APIPost = {
        ...mockApiPost,
        createdAt: new Date().toISOString(),
      };

      const result = apiPostToPost(recentPost);
      expect(result.time).toBe('now');
    });

    it('should format time in minutes', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const post: APIPost = {
        ...mockApiPost,
        createdAt: fiveMinsAgo,
      };

      const result = apiPostToPost(post);
      expect(result.time).toBe('5m');
    });

    it('should format time in hours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const post: APIPost = {
        ...mockApiPost,
        createdAt: threeHoursAgo,
      };

      const result = apiPostToPost(post);
      expect(result.time).toBe('3h');
    });

    it('should format time in days', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const post: APIPost = {
        ...mockApiPost,
        createdAt: twoDaysAgo,
      };

      const result = apiPostToPost(post);
      expect(result.time).toBe('2d');
    });

    it('should format as date for posts older than a week', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const post: APIPost = {
        ...mockApiPost,
        createdAt: tenDaysAgo,
      };

      const result = apiPostToPost(post);
      // Should be a date string (format varies by locale)
      expect(result.time).toMatch(/\d+\/\d+\/\d+/);
    });

    it('should handle invalid date gracefully', () => {
      const post: APIPost = {
        ...mockApiPost,
        createdAt: 'invalid-date',
      };

      const result = apiPostToPost(post);
      expect(result.time).toBe('unknown');
    });
  });

  describe('Display name logic', () => {
    it('should truncate long wallet addresses', () => {
      const longWallet = '7xKVa1234567890abcdefghijklmnopqrstuvwxyzABCDEF';
      const post: APIPost = {
        ...mockApiPost,
        authorWallet: longWallet,
        author: {
          ...mockAuthor,
          username: undefined,
          snsUsername: undefined,
          walletAddress: longWallet,
        },
      };

      const result = apiPostToPost(post);
      expect(result.user).toBe('7xKVa1234567890...');
    });

    it('should not truncate short wallet addresses', () => {
      const shortWallet = '7xKVa123';
      const post: APIPost = {
        ...mockApiPost,
        authorWallet: shortWallet,
        author: {
          ...mockAuthor,
          username: undefined,
          snsUsername: undefined,
          walletAddress: shortWallet,
        },
      };

      const result = apiPostToPost(post);
      expect(result.user).toBe('7xKVa123');
    });

    it('should return "Unknown" for missing author and wallet', () => {
      const post: APIPost = {
        ...mockApiPost,
        authorWallet: '',
        author: undefined,
      };

      const result = apiPostToPost(post);
      expect(result.user).toBe('Unknown');
    });
  });
});
