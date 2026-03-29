import type { Post } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformOriginal(orig: any, isReply = false): Post {
  return {
    id: orig.id,
    user: orig.author?.username || orig.author?.snsUsername || orig.authorWallet?.slice(0, 15) || 'Unknown',
    wallet: orig.authorWallet,
    userTheme: orig.author?.themeColor,
    content: orig.content || '',
    likes: orig.likeCount || 0,
    replies: isReply ? 0 : (orig.replyCount || 0),
    tips: Number(isReply ? orig.tipCount : orig.tipAmount) || 0,
    comments: isReply ? 0 : (orig.replyCount || 0),
    reposts: orig.repostCount || 0,
    time: new Date(orig.createdAt).toLocaleString(),
    createdAt: orig.createdAt,
    isPremium: orig.author?.tier === 'premium' || orig.author?.tier === 'vip',
    image: orig.imageUrl,
    avatar: orig.author?.nftAvatar || null,
  } as Post;
}

/**
 * Transform a raw backend post into the frontend Post format.
 * Handles regular posts, reposts (originalPost), and reply reposts (originalReply).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformPost(raw: any): Post {
  const repostedPost = raw.isRepost
    ? (raw.originalPost
        ? transformOriginal(raw.originalPost)
        : raw.originalReply
          ? transformOriginal(raw.originalReply, true)
          : undefined)
    : undefined;

  return {
    ...raw,
    user: raw.author?.username || raw.author?.snsUsername || raw.authorWallet?.slice(0, 15) || 'Unknown',
    wallet: raw.authorWallet,
    userTheme: raw.author?.themeColor,
    time: new Date(raw.createdAt).toLocaleString(),
    createdAt: raw.createdAt,
    likes: raw.likeCount || 0,
    comments: raw.replyCount || 0,
    reposts: raw.repostCount || 0,
    tips: Number(raw.tipAmount) || 0,
    image: raw.imageUrl,
    avatar: raw.author?.nftAvatar || null,
    isPremium: raw.author?.tier === 'premium' || raw.author?.tier === 'vip',
    shoutoutExpiresAt: raw.shoutoutExpiresAt,
    repostedBy: raw.isRepost
      ? (raw.author?.username || raw.author?.snsUsername || raw.authorWallet?.slice(0, 15))
      : undefined,
    repostedPost,
  } as Post;
}

/**
 * Transform a raw backend post with async avatar resolution (for WebSocket/repost handlers).
 */
export async function transformPostAsync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
  resolveAvatar: (nftAvatar: string | null | undefined) => Promise<string | undefined>,
): Promise<Post> {
  const base = transformPost(raw);
  base.avatar = (await resolveAvatar(raw.author?.nftAvatar)) || undefined;

  if (base.repostedPost) {
    const origSource = raw.originalPost || raw.originalReply;
    if (origSource) {
      (base.repostedPost as Post).avatar =
        (await resolveAvatar(origSource.author?.nftAvatar)) || undefined;
    }
  }

  return base;
}
