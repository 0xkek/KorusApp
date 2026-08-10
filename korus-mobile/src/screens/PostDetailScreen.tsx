import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { postsAPI } from '../api/posts';
import type { Post, Reply } from '../api/types';
import { displayName, relativeTime, resolveAvatarUrl } from '../api/types';
import { LikeIcon, ReplyIcon, RepostIcon, ShareIcon, TipIcon } from '../components/Icons';
import { notify } from '../notify';
import { theme } from '../theme';

const LIKE_COLOR = '#ef4444';
const TIP_COLOR = '#f59e0b';

interface Props {
  postId: string;
  onBack: () => void;
  onOpenProfile?: (walletAddress: string) => void;
  onReply?: (postId: string) => void;
  onTip?: (post: Post) => void;
  token?: string | null;
  currentWallet?: string | null;
}

export function PostDetailScreen({
  postId,
  onBack,
  onOpenProfile,
  onReply,
  onTip,
  token,
  currentWallet,
}: Props) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [repostedReplies, setRepostedReplies] = useState<Set<string>>(new Set());

  const toggleReplyRepost = useCallback(
    async (reply: Reply) => {
      if (!token) return;
      const was = repostedReplies.has(reply.id);
      setRepostedReplies((prev) => {
        const next = new Set(prev);
        if (was) next.delete(reply.id);
        else next.add(reply.id);
        return next;
      });
      setPost((p) =>
        p
          ? {
              ...p,
              replies: p.replies?.map((r) =>
                r.id === reply.id
                  ? { ...r, repostCount: Math.max(0, (r.repostCount ?? 0) + (was ? -1 : 1)) }
                  : r
              ),
            }
          : p
      );
      try {
        const res = await postsAPI.toggleReplyRepost(reply.id, token);
        setRepostedReplies((prev) => {
          const next = new Set(prev);
          if (res.reposted) next.add(reply.id);
          else next.delete(reply.id);
          return next;
        });
      } catch {
        setRepostedReplies((prev) => {
          const next = new Set(prev);
          if (was) next.add(reply.id);
          else next.delete(reply.id);
          return next;
        });
        setPost((p) =>
          p
            ? {
                ...p,
                replies: p.replies?.map((r) =>
                  r.id === reply.id
                    ? { ...r, repostCount: Math.max(0, (r.repostCount ?? 0) + (was ? 1 : -1)) }
                    : r
                ),
              }
            : p
        );
      }
    },
    [token, repostedReplies]
  );

  const toggleLike = useCallback(async () => {
    if (!token || !post) return;
    const was = liked;
    setLiked(!was);
    setPost((p) =>
      p ? { ...p, likeCount: Math.max(0, (p.likeCount ?? 0) + (was ? -1 : 1)) } : p
    );
    try {
      const res = await postsAPI.toggleLike(post.id, token);
      setLiked(res.liked);
    } catch {
      setLiked(was);
      setPost((p) =>
        p ? { ...p, likeCount: Math.max(0, (p.likeCount ?? 0) + (was ? 1 : -1)) } : p
      );
    }
  }, [token, post, liked]);

  const toggleRepost = useCallback(async () => {
    if (!token || !post) return;
    const was = reposted;
    setReposted(!was);
    setPost((p) =>
      p ? { ...p, repostCount: Math.max(0, (p.repostCount ?? 0) + (was ? -1 : 1)) } : p
    );
    try {
      const res = await postsAPI.repost(post.id, token);
      setReposted(res.reposted);
    } catch {
      setReposted(was);
      setPost((p) =>
        p ? { ...p, repostCount: Math.max(0, (p.repostCount ?? 0) + (was ? 1 : -1)) } : p
      );
    }
  }, [token, post, reposted]);

  const toggleReplyLike = useCallback(
    async (reply: Reply) => {
      if (!token) return;
      const was = likedReplies.has(reply.id);
      setLikedReplies((prev) => {
        const next = new Set(prev);
        if (was) next.delete(reply.id);
        else next.add(reply.id);
        return next;
      });
      setPost((p) =>
        p
          ? {
              ...p,
              replies: p.replies?.map((r) =>
                r.id === reply.id
                  ? { ...r, likeCount: Math.max(0, (r.likeCount ?? 0) + (was ? -1 : 1)) }
                  : r
              ),
            }
          : p
      );
      try {
        const res = await postsAPI.toggleReplyLike(reply.id, token);
        setLikedReplies((prev) => {
          const next = new Set(prev);
          if (res.liked) next.add(reply.id);
          else next.delete(reply.id);
          return next;
        });
      } catch {
        setLikedReplies((prev) => {
          const next = new Set(prev);
          if (was) next.add(reply.id);
          else next.delete(reply.id);
          return next;
        });
        setPost((p) =>
          p
            ? {
                ...p,
                replies: p.replies?.map((r) =>
                  r.id === reply.id
                    ? { ...r, likeCount: Math.max(0, (r.likeCount ?? 0) + (was ? 1 : -1)) }
                    : r
                ),
              }
            : p
        );
      }
    },
    [token, likedReplies]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Public endpoint — no auth needed, same as shared links on web.
        const res = await postsAPI.getPost(postId);
        if (!cancelled) setPost(res.post);

        // Per-viewer state is not part of the post payload, so fetch it
        // separately or the heart renders hollow on an already-liked post.
        if (token && !cancelled) {
          try {
            const inter = await postsAPI.getUserInteractions([postId], token);
            const state = inter.interactions?.[postId];
            if (!cancelled && state) {
              setLiked(Boolean(state.liked));
              setReposted(Boolean(state.reposted));
            }
          } catch {
            // Non-fatal.
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, token]);

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Post</Text>
        {/* Shares the web URL, not korus://, so it works for people without
            the app — and Android App Links open it here for those who have it. */}
        <Pressable
          onPress={() =>
            Share.share({
              message: `https://korus.fun/post/${postId}`,
            }).catch(() => {})
          }
          hitSlop={12}
        >
          <ShareIcon size={20} color={theme.mint} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.mint} />
        </View>
      ) : error || !post ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Post not found'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            style={styles.authorRow}
            onPress={
              onOpenProfile && post.authorWallet
                ? () => onOpenProfile(post.authorWallet)
                : undefined
            }
          >
            {resolveAvatarUrl(post.author?.nftAvatar) ? (
              <Image
                source={{ uri: resolveAvatarUrl(post.author?.nftAvatar)! }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: post.author?.themeColor ?? theme.mint },
                ]}
              >
                <Text style={styles.avatarText}>
                  {post.authorWallet.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.name}>
                {displayName(post.author, post.authorWallet)}
              </Text>
              <Text style={styles.time}>{relativeTime(post.createdAt)}</Text>
            </View>
          </Pressable>

          {post.content ? <Text style={styles.postText}>{post.content}</Text> : null}

          {post.imageUrl ? (
            <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : null}

          <View style={styles.statsRow}>
            <Stat
              icon={<ReplyIcon size={20} color={theme.textTertiary} />}
              value={post.replyCount}
              onPress={token && onReply ? () => onReply(postId) : undefined}
            />
            <Stat
              icon={
                <LikeIcon
                  size={20}
                  color={liked ? LIKE_COLOR : theme.textTertiary}
                  fill={liked ? LIKE_COLOR : 'none'}
                />
              }
              value={post.likeCount}
              active={liked}
              activeColor={LIKE_COLOR}
              onPress={token ? toggleLike : undefined}
            />
            <Stat
              icon={
                <RepostIcon size={20} color={reposted ? theme.mint : theme.textTertiary} />
              }
              value={post.repostCount}
              active={reposted}
              activeColor={theme.mint}
              onPress={
                !token
                  ? undefined
                  : post.authorWallet === currentWallet
                    ? () => notify('You cannot repost your own post')
                    : toggleRepost
              }
            />
            <Stat
              icon={
                <TipIcon
                  size={20}
                  color={Number(post.tipAmount) > 0 ? TIP_COLOR : theme.textTertiary}
                />
              }
              value={Number(post.tipAmount) || 0}
              active={Number(post.tipAmount) > 0}
              activeColor={TIP_COLOR}
              onPress={
                !token || !onTip
                  ? undefined
                  : post.authorWallet === currentWallet
                    ? () => notify('You cannot tip your own post')
                    : () => onTip(post)
              }
            />
          </View>

          {token && onReply ? (
            <Pressable onPress={() => onReply(postId)} style={styles.replyButton}>
              <Text style={styles.replyButtonText}>Write a reply</Text>
            </Pressable>
          ) : null}

          <Text style={styles.repliesHeader}>
            {post.replies?.length
              ? `${post.replies.length} ${post.replies.length === 1 ? 'reply' : 'replies'}`
              : 'No replies yet'}
          </Text>

          {post.replies?.map((reply: Reply) => (
            <View key={reply.id} style={styles.reply}>
              <Pressable
                onPress={
                  onOpenProfile ? () => onOpenProfile(reply.authorWallet) : undefined
                }
                hitSlop={6}
              >
                <Text style={styles.replyName}>
                  {displayName(reply.author, reply.authorWallet)}
                  <Text style={styles.time}> · {relativeTime(reply.createdAt)}</Text>
                </Text>
              </Pressable>
              <Text style={styles.replyText}>{reply.content}</Text>
              <View style={styles.replyActions}>
                <Pressable
                  onPress={token ? () => toggleReplyLike(reply) : undefined}
                  disabled={!token}
                  hitSlop={8}
                  style={styles.replyAction}
                >
                  <LikeIcon
                    size={16}
                    color={likedReplies.has(reply.id) ? LIKE_COLOR : theme.textTertiary}
                    fill={likedReplies.has(reply.id) ? LIKE_COLOR : 'none'}
                  />
                  <Text
                    style={[
                      styles.replyLikeText,
                      likedReplies.has(reply.id) && styles.replyLiked,
                    ]}
                  >
                    {reply.likeCount ?? 0}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={
                    !token
                      ? undefined
                      : reply.authorWallet === currentWallet
                        ? () => notify('You cannot repost your own reply')
                        : () => toggleReplyRepost(reply)
                  }
                  disabled={!token}
                  hitSlop={8}
                  style={styles.replyAction}
                >
                  <RepostIcon
                    size={16}
                    color={
                      repostedReplies.has(reply.id) ? theme.mint : theme.textTertiary
                    }
                  />
                  <Text
                    style={[
                      styles.replyLikeText,
                      repostedReplies.has(reply.id) && styles.replyReposted,
                    ]}
                  >
                    {reply.repostCount ?? 0}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({
  icon,
  value,
  active,
  activeColor,
  onPress,
}: {
  icon: React.ReactNode;
  value: number;
  active?: boolean;
  activeColor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.stat} onPress={onPress} disabled={!onPress} hitSlop={10}>
      {icon}
      <Text style={[styles.statValue, active && activeColor ? { color: activeColor } : null]}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  back: { color: theme.mint, fontSize: 16, fontWeight: '600' },
  navTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: theme.error, textAlign: 'center' },
  content: { padding: 16 },
  authorRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontWeight: '700' },
  name: { color: theme.text, fontSize: 16, fontWeight: '700' },
  time: { color: theme.textTertiary, fontSize: 13 },
  postText: { color: theme.text, fontSize: 17, lineHeight: 25 },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    marginTop: 14,
    backgroundColor: theme.surface,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statValue: { color: theme.text, fontSize: 15, fontWeight: '600' },
  replyButton: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  replyButtonText: { color: theme.mint, fontWeight: '600', fontSize: 14 },
  repliesHeader: {
    color: theme.textTertiary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  reply: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  replyName: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  replyText: { color: theme.textSecondary, fontSize: 15, lineHeight: 21 },
  replyActions: { marginTop: 8, flexDirection: 'row', gap: 20 },
  replyAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyLikeText: { color: theme.textTertiary, fontSize: 13 },
  replyLiked: { color: LIKE_COLOR },
  replyReposted: { color: theme.mint },
});
