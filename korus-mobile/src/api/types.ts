/**
 * Backend response types.
 *
 * Shapes verified against production (GET /api/posts) rather than copied from
 * the web app's types, which carry UI-transform fields the API never sends.
 */

export interface Author {
  walletAddress: string;
  tier: string;
  genesisVerified: boolean;
  snsUsername: string | null;
  username: string | null;
  nftAvatar: string | null;
  themeColor: string | null;
}

export interface Post {
  id: string;
  authorWallet: string;
  content: string;
  topic: string | null;
  subtopic: string | null;
  likeCount: number;
  replyCount: number;
  tipCount: number;
  tipAmount: string | number;
  repostCount: number;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isShoutout: boolean;
  isRepost: boolean;
  originalPostId: string | null;
  repostComment: string | null;
  author: Author;
  originalPost?: Post | null;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  postId: string;
  authorWallet: string;
  content: string;
  likeCount: number;
  createdAt: string;
  author: Author;
}

export interface PaginationMeta {
  resultCount: number;
  nextCursor: string | null;
  previousCursor: string | null;
  hasMore: boolean;
}

export interface PostsResponse {
  success: boolean;
  posts: Post[];
  meta: PaginationMeta;
}

export interface SinglePostResponse {
  success: boolean;
  post: Post;
}

export interface TrendingResponse {
  success: boolean;
  posts: Post[];
  pagination?: { hasMore: boolean };
}

/**
 * '__wallet__' is a backend sentinel meaning "show the wallet address rather
 * than a name". Treating it as a username renders the literal string.
 */
export function displayName(author: Author | null | undefined, fallback?: string): string {
  if (!author) return shortAddress(fallback ?? '');
  const username = author.username && author.username !== '__wallet__' ? author.username : null;
  const sns = author.snsUsername && author.snsUsername !== '__wallet__' ? author.snsUsername : null;
  if (username) return `@${username}`;
  if (sns) return sns;
  return shortAddress(author.walletAddress);
}

export function shortAddress(address: string): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}
