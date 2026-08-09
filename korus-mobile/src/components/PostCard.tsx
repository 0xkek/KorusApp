import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Post } from '../api/types';
import { displayName, relativeTime, resolveAvatarUrl } from '../api/types';
import { theme } from '../theme';

interface Props {
  post: Post;
  onPress?: (post: Post) => void;
  onPressAuthor?: (walletAddress: string) => void;
  /** Omitted when signed out — the actions then render as plain counts. */
  onToggleLike?: (post: Post) => void;
  onReply?: (post: Post) => void;
  liked?: boolean;
}

function PostCardBase({ post, onPress, onPressAuthor, onToggleLike, onReply, liked }: Props) {
  // A repost renders the original's content with a "reposted" line above it.
  const source = post.isRepost && post.originalPost ? post.originalPost : post;
  const author = source.author;
  const avatar = resolveAvatarUrl(author?.nftAvatar);

  return (
    <Pressable
      onPress={() => onPress?.(source)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {post.isRepost && (
        <Text style={styles.repostLine}>
          {displayName(post.author, post.authorWallet)} reposted
        </Text>
      )}

      <View style={styles.row}>
        {/* Tapping the avatar opens the author's profile; tapping anywhere
            else on the card opens the post. */}
        <Pressable
          onPress={
            onPressAuthor && author?.walletAddress
              ? () => onPressAuthor(author.walletAddress)
              : undefined
          }
          hitSlop={6}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: author?.themeColor ?? theme.mint },
              ]}
            >
              <Text style={styles.avatarText}>
                {(author?.walletAddress ?? '??').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName(author, source.authorWallet)}
            </Text>
            {author?.tier === 'premium' && <Text style={styles.badge}>★</Text>}
            <Text style={styles.time}>· {relativeTime(source.createdAt)}</Text>
          </View>

          {source.content ? (
            <Text style={styles.content}>{source.content}</Text>
          ) : null}

          {source.imageUrl ? (
            <Image
              source={{ uri: source.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.stats}>
            <Pressable
              onPress={onReply ? () => onReply(source) : undefined}
              hitSlop={8}
              disabled={!onReply}
            >
              <Text style={styles.stat}>{source.replyCount ?? 0} replies</Text>
            </Pressable>

            <Pressable
              onPress={onToggleLike ? () => onToggleLike(source) : undefined}
              hitSlop={8}
              disabled={!onToggleLike}
            >
              <Text style={[styles.stat, liked && styles.statLiked]}>
                {liked ? '♥' : '♡'} {source.likeCount ?? 0}
              </Text>
            </Pressable>

            <Text style={styles.stat}>{source.repostCount ?? 0} reposts</Text>
            {Number(source.tipAmount) > 0 && (
              <Text style={styles.tip}>{Number(source.tipAmount).toFixed(2)} SOL</Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Feeds re-render often; posts are immutable once loaded.
export const PostCard = memo(PostCardBase);

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cardPressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  repostLine: {
    color: theme.textTertiary,
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 52,
  },
  row: { flexDirection: 'row', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontWeight: '700', fontSize: 13 },
  body: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  name: { color: theme.text, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  badge: { color: '#FACC15', fontSize: 12 },
  time: { color: theme.textTertiary, fontSize: 13 },
  content: { color: theme.text, fontSize: 15, lineHeight: 21 },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: theme.surface,
  },
  stats: { flexDirection: 'row', gap: 14, marginTop: 10, alignItems: 'center' },
  stat: { color: theme.textTertiary, fontSize: 13 },
  statLiked: { color: '#f87171' },
  tip: { color: theme.mint, fontSize: 13, fontWeight: '600' },
});
