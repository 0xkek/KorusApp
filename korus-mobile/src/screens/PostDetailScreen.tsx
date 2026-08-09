import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { postsAPI } from '../api/posts';
import type { Post, Reply } from '../api/types';
import { displayName, relativeTime, resolveAvatarUrl } from '../api/types';
import { theme } from '../theme';

interface Props {
  postId: string;
  onBack: () => void;
  onOpenProfile?: (walletAddress: string) => void;
  onReply?: (postId: string) => void;
  token?: string | null;
  currentWallet?: string | null;
}

export function PostDetailScreen({
  postId,
  onBack,
  onOpenProfile,
  onReply,
  token,
  currentWallet,
}: Props) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());

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
        <View style={{ width: 54 }} />
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
            <Stat value={post.replyCount} label="Replies" />
            <Stat
              value={post.likeCount}
              label="Likes"
              active={liked}
              onPress={token ? toggleLike : undefined}
            />
            <Stat
              value={post.repostCount}
              label="Reposts"
              active={reposted}
              // Reposting your own post is rejected by the backend.
              onPress={token && post.authorWallet !== currentWallet ? toggleRepost : undefined}
            />
            <Stat value={Number(post.tipAmount) || 0} label="SOL tipped" />
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
              <Pressable
                onPress={token ? () => toggleReplyLike(reply) : undefined}
                disabled={!token}
                hitSlop={8}
                style={styles.replyLike}
              >
                <Text
                  style={[
                    styles.replyLikeText,
                    likedReplies.has(reply.id) && styles.replyLiked,
                  ]}
                >
                  {likedReplies.has(reply.id) ? '♥' : '♡'} {reply.likeCount ?? 0}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({
  value,
  label,
  active,
  onPress,
}: {
  value: number;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.stat} onPress={onPress} disabled={!onPress} hitSlop={8}>
      <Text style={[styles.statValue, active && styles.statActive]}>{value}</Text>
      <Text style={[styles.statLabel, active && styles.statActive]}>{label}</Text>
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
    gap: 24,
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  stat: { alignItems: 'flex-start' },
  statValue: { color: theme.text, fontSize: 17, fontWeight: '700' },
  statLabel: { color: theme.textTertiary, fontSize: 12, marginTop: 2 },
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
  replyLike: { marginTop: 8, alignSelf: 'flex-start' },
  replyLikeText: { color: theme.textTertiary, fontSize: 13 },
  replyLiked: { color: '#f87171' },
  statActive: { color: theme.mint },
});
