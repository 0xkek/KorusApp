import { useEffect, useState } from 'react';
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
}

export function PostDetailScreen({ postId, onBack, onOpenProfile }: Props) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Public endpoint — no auth needed, same as shared links on web.
        const res = await postsAPI.getPost(postId);
        if (!cancelled) setPost(res.post);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

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
            <Stat value={post.likeCount} label="Likes" />
            <Stat value={post.repostCount} label="Reposts" />
            <Stat value={Number(post.tipAmount) || 0} label="SOL tipped" />
          </View>

          <Text style={styles.repliesHeader}>
            {post.replies?.length
              ? `${post.replies.length} ${post.replies.length === 1 ? 'reply' : 'replies'}`
              : 'No replies yet'}
          </Text>

          {post.replies?.map((reply: Reply) => (
            <View key={reply.id} style={styles.reply}>
              <Text style={styles.replyName}>
                {displayName(reply.author, reply.authorWallet)}
                <Text style={styles.time}> · {relativeTime(reply.createdAt)}</Text>
              </Text>
              <Text style={styles.replyText}>{reply.content}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
});
