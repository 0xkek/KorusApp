/**
 * Type adapters for transforming backend API types to frontend UI types
 * This provides a single source of truth for data transformation logic
 */

import { APIPost, APIReply, APIAuthor } from '@/types/api';
import { Post, Reply } from '@/types/post';

/**
 * Truncate wallet address for display
 * @param address - Full wallet address
 * @returns Truncated address
 */
function truncateAddress(address: string): string {
  if (!address) return 'Unknown';
  return address.length > 15 ? `${address.slice(0, 15)}...` : address;
}

/**
 * Get display name from author data
 * Priority: username > snsUsername > truncated wallet
 */
function getDisplayName(author?: APIAuthor, wallet?: string): string {
  if (!author && !wallet) return 'Unknown';
  if (author?.username) return author.username;
  if (author?.snsUsername) return author.snsUsername;
  return truncateAddress(wallet || author?.walletAddress || '');
}

/**
 * Format date to relative time string
 * @param dateString - ISO date string
 * @returns Human-readable time string
 */
function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
  } catch {
    return 'unknown';
  }
}

/**
 * Transform backend API post to frontend Post type
 * @param apiPost - Post from backend API
 * @returns Frontend Post object
 */
export function apiPostToPost(apiPost: APIPost): Post {
  return {
    id: typeof apiPost.id === 'string' ? parseInt(apiPost.id) : apiPost.id,
    user: getDisplayName(apiPost.author, apiPost.authorWallet),
    wallet: apiPost.authorWallet,
    content: apiPost.content || '',
    likes: apiPost.likeCount || 0,
    replies: apiPost.replyCount || 0,
    comments: apiPost.replyCount || 0,
    reposts: apiPost.repostCount || 0,
    tips: Number(apiPost.tipAmount) || 0,
    tipCount: apiPost.tipCount || 0,
    time: formatTime(apiPost.createdAt),
    isPremium: apiPost.author?.tier === 'premium',
    isShoutout: apiPost.isShoutout || false,
    isSponsored: false, // Not yet implemented in backend
    isRepost: apiPost.isRepost || false,
    image: apiPost.imageUrl,
    imageUrl: apiPost.imageUrl,
    video: apiPost.videoUrl,
    videoUrl: apiPost.videoUrl,
    avatar: apiPost.author?.nftAvatar || null,
    userTheme: apiPost.author?.themeColor,
    shoutoutDuration: apiPost.shoutoutDuration,
    shoutoutExpiresAt: apiPost.shoutoutExpiresAt,
    category: apiPost.topic,
    subcategory: apiPost.subtopic,
    // Recursively transform reposted post
    repostedPost: apiPost.originalPost ? apiPostToPost(apiPost.originalPost) : undefined,
  };
}

/**
 * Transform backend API reply to frontend Reply type
 * @param apiReply - Reply from backend API
 * @returns Frontend Reply object
 */
export function apiReplyToReply(apiReply: APIReply): Reply {
  return {
    id: typeof apiReply.id === 'string' ? parseInt(apiReply.id) : apiReply.id,
    postId: apiReply.postId,
    user: getDisplayName(apiReply.author, apiReply.authorWallet),
    wallet: apiReply.authorWallet,
    content: apiReply.content,
    likes: apiReply.likeCount,
    // Recursively transform child replies
    replies: apiReply.childReplies?.map(apiReplyToReply) || [],
    time: formatTime(apiReply.createdAt),
    isPremium: apiReply.author.tier === 'premium',
    image: apiReply.imageUrl,
    videoUrl: apiReply.videoUrl,
  };
}

/**
 * Transform array of API posts to frontend Posts
 * @param apiPosts - Array of posts from backend
 * @returns Array of frontend Post objects
 */
export function apiPostsToPost(apiPosts: APIPost[]): Post[] {
  return apiPosts.map(apiPostToPost);
}

/**
 * Transform array of API replies to frontend Replies
 * @param apiReplies - Array of replies from backend
 * @returns Array of frontend Reply objects
 */
export function apiRepliesToReplies(apiReplies: APIReply[]): Reply[] {
  return apiReplies.map(apiReplyToReply);
}
