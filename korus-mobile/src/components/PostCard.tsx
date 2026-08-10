import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Post } from '../api/types';
import { displayName, relativeTime, resolveAvatarUrl } from '../api/types';
import { LikeIcon, ReplyIcon, RepostIcon, TipIcon } from './Icons';
import { notify } from '../notify';
import { theme, useTheme } from '../theme';

// Match the web app's action colours.
const LIKE_COLOR = '#ef4444';
const TIP_COLOR = '#f59e0b';

interface Props {
  post: Post;
  onPress?: (post: Post) => void;
  onPressAuthor?: (walletAddress: string) => void;
  /** Omitted when signed out — the actions then render as plain counts. */
  onToggleLike?: (post: Post) => void;
  onToggleRepost?: (post: Post) => void;
  onTip?: (post: Post) => void;
  onReply?: (post: Post) => void;
  liked?: boolean;
  reposted?: boolean;
  /** The signed-in wallet, used to hide reposting your own post. */
  currentWallet?: string | null;
}

function PostCardBase({
  post,
  onPress,
  onPressAuthor,
  onToggleLike,
  onToggleRepost,
  onTip,
  onReply,
  liked,
  reposted,
  currentWallet,
}: Props) {
  const t = useTheme();
  // A repost renders what it reposted, with a "reposted" line above it. The
  // source is either a post or — since reply reposts — a reply, which has no
  // repost/tip counts of its own, so those render as zero.
  const repostedReply = post.isRepost && !post.originalPost ? post.originalReply : null;
  const source: Post = post.isRepost && post.originalPost ? post.originalPost : post;
  const author = repostedReply ? repostedReply.author : source.author;
  const avatar = resolveAvatarUrl(author?.nftAvatar);
  const bodyText = repostedReply ? repostedReply.content : source.content;
  const authorWallet = repostedReply ? repostedReply.authorWallet : source.authorWallet;
  // Reposting or tipping your own post is rejected by the backend. Rather than
  // silently inert controls, they stay tappable when signed in and explain why.
  const isOwnPost = Boolean(currentWallet) && authorWallet === currentWallet;
  const canRepost = Boolean(onToggleRepost) && !isOwnPost;
  const canTip = Boolean(onTip) && !isOwnPost;

  return (
    <Pressable
      // A reposted reply opens the thread it lives in, not the empty repost.
      onPress={() =>
        onPress?.(
          repostedReply ? ({ ...source, id: repostedReply.postId } as Post) : source
        )
      }
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {post.isRepost && (
        <Text style={styles.repostLine}>
          {displayName(post.author, post.authorWallet)} reposted
          {repostedReply ? ' a reply' : ''}
        </Text>
      )}

      {/* A quote repost adds a comment of its own above the quoted content. */}
      {post.isRepost && post.repostComment ? (
        <Text style={styles.quoteComment}>{post.repostComment}</Text>
      ) : null}

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
                { backgroundColor: author?.themeColor ?? t.mint },
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
              {displayName(author, authorWallet)}
            </Text>
            {author?.tier === 'premium' && <Text style={styles.badge}>★</Text>}
            <Text style={styles.time}>
              · {relativeTime(repostedReply ? repostedReply.createdAt : source.createdAt)}
            </Text>
          </View>

          {bodyText ? <Text style={[styles.content, { backgroundColor: t.background }]}>{bodyText}</Text> : null}

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
              style={styles.action}
            >
              <ReplyIcon color={t.textTertiary} />
              <Text style={styles.stat}>{source.replyCount ?? 0}</Text>
            </Pressable>

            <Pressable
              onPress={onToggleLike ? () => onToggleLike(source) : undefined}
              hitSlop={8}
              disabled={!onToggleLike}
              style={styles.action}
            >
              <LikeIcon
                color={liked ? LIKE_COLOR : t.textTertiary}
                fill={liked ? LIKE_COLOR : 'none'}
              />
              <Text style={[styles.stat, liked && styles.statLiked]}>
                {source.likeCount ?? 0}
              </Text>
            </Pressable>

            <Pressable
              onPress={
                canRepost
                  ? () => onToggleRepost!(source)
                  : isOwnPost && onToggleRepost
                    ? () => notify('You cannot repost your own post')
                    : undefined
              }
              hitSlop={8}
              disabled={!canRepost && !(isOwnPost && onToggleRepost)}
              style={styles.action}
            >
              <RepostIcon color={reposted ? t.mint : t.textTertiary} />
              <Text style={[styles.stat, reposted && styles.statReposted]}>
                {source.repostCount ?? 0}
              </Text>
            </Pressable>

            <Pressable
              onPress={
                canTip
                  ? () => onTip!(source)
                  : isOwnPost && onTip
                    ? () => notify('You cannot tip your own post')
                    : undefined
              }
              hitSlop={8}
              disabled={!canTip && !(isOwnPost && onTip)}
              style={styles.action}
            >
              <TipIcon
                color={Number(source.tipAmount) > 0 ? TIP_COLOR : t.textTertiary}
              />
              <Text style={Number(source.tipAmount) > 0 ? styles.tip : styles.stat}>
                {Number(source.tipAmount) > 0
                  ? Number(source.tipAmount).toFixed(2)
                  : '0'}
              </Text>
            </Pressable>
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
  quoteComment: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 10,
  },
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
  stats: { flexDirection: 'row', gap: 22, marginTop: 12, alignItems: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { color: theme.textTertiary, fontSize: 13 },
  statLiked: { color: LIKE_COLOR },
  statReposted: { color: theme.mint },
  tip: { color: TIP_COLOR, fontSize: 13, fontWeight: '600' },
});
