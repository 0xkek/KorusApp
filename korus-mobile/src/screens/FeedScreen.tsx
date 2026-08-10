import { useCallback, useEffect, useState, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { postsAPI } from '../api/posts';
import type { Post } from '../api/types';
import { PostCard } from '../components/PostCard';
import { ShoutoutCard } from '../components/ShoutoutCard';
import { useTheme , type Theme } from '../theme';

type Tab = 'home' | 'trending';

interface Props {
  onOpenPost: (post: Post) => void;
  onOpenProfile?: (walletAddress: string) => void;
  onReply?: (post: Post) => void;
  onTip?: (post: Post) => void;
  header?: React.ReactElement;
  /** Null when signed out — likes and replies then render as plain counts. */
  token?: string | null;
  /** Used to hide reposting your own post, which the backend rejects. */
  currentWallet?: string | null;
  /** Bumped by the parent after a write, to force a refetch. */
  refreshKey?: number;
  /** Which feed to show. The tab row itself now lives above this screen. */
  feed?: Tab;
}

export function FeedScreen({
  onOpenPost,
  onOpenProfile,
  onReply,
  onTip,
  header,
  token,
  currentWallet,
  refreshKey = 0,
  feed = 'home',
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const tab = feed;
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which posts the signed-in user has liked. Loaded in a batch after each
  // page, since the posts endpoints do not include per-viewer state.
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());

  /** Fetch like state for a batch of posts. Silent on failure — worst case the
   *  hearts render hollow until the next refresh. */
  const loadInteractions = useCallback(
    async (batch: Post[]) => {
      if (!token || batch.length === 0) return;
      try {
        const res = await postsAPI.getUserInteractions(
          batch.map((p) => p.id),
          token
        );
        setLikedIds((prev) => {
          const next = new Set(prev);
          Object.entries(res.interactions ?? {}).forEach(([id, state]) => {
            if (state?.liked) next.add(id);
            else next.delete(id);
          });
          return next;
        });
        setRepostedIds((prev) => {
          const next = new Set(prev);
          Object.entries(res.interactions ?? {}).forEach(([id, state]) => {
            if (state?.reposted) next.add(id);
            else next.delete(id);
          });
          return next;
        });
      } catch {
        // Non-fatal.
      }
    },
    [token]
  );

  const toggleLike = useCallback(
    async (post: Post) => {
      if (!token) return;
      const wasLiked = likedIds.has(post.id);

      // Optimistic — a like should feel instant.
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likeCount: Math.max(0, (p.likeCount ?? 0) + (wasLiked ? -1 : 1)) }
            : p
        )
      );

      try {
        const res = await postsAPI.toggleLike(post.id, token);
        // Trust the server's resulting state over our guess.
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (res.liked) next.add(post.id);
          else next.delete(post.id);
          return next;
        });
      } catch {
        // Roll back both the flag and the count.
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(post.id);
          else next.delete(post.id);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, likeCount: Math.max(0, (p.likeCount ?? 0) + (wasLiked ? 1 : -1)) }
              : p
          )
        );
      }
    },
    [likedIds, token]
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more', activeTab: Tab) => {
      if (mode === 'more' && (!hasMore || loadingMore)) return;

      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setError(null);

      try {
        if (activeTab === 'trending') {
          const res = await postsAPI.getTrending({
            limit: 20,
            offset: mode === 'more' ? posts.length : 0,
          });
          setPosts((prev) => (mode === 'more' ? [...prev, ...res.posts] : res.posts));
          setHasMore(res.pagination?.hasMore ?? false);
          void loadInteractions(res.posts);
        } else {
          const res = await postsAPI.getPosts({
            limit: 20,
            cursor: mode === 'more' ? cursor ?? undefined : undefined,
          });
          setPosts((prev) => (mode === 'more' ? [...prev, ...res.posts] : res.posts));
          setCursor(res.meta?.nextCursor ?? null);
          setHasMore(res.meta?.hasMore ?? false);
          void loadInteractions(res.posts);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [cursor, hasMore, loadingMore, posts.length, loadInteractions]
  );

  const toggleRepost = useCallback(
    async (post: Post) => {
      if (!token) return;
      const wasReposted = repostedIds.has(post.id);

      setRepostedIds((prev) => {
        const next = new Set(prev);
        if (wasReposted) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, repostCount: Math.max(0, (p.repostCount ?? 0) + (wasReposted ? -1 : 1)) }
            : p
        )
      );

      try {
        const res = await postsAPI.repost(post.id, token);
        setRepostedIds((prev) => {
          const next = new Set(prev);
          if (res.reposted) next.add(post.id);
          else next.delete(post.id);
          return next;
        });
      } catch {
        setRepostedIds((prev) => {
          const next = new Set(prev);
          if (wasReposted) next.add(post.id);
          else next.delete(post.id);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, repostCount: Math.max(0, (p.repostCount ?? 0) + (wasReposted ? 1 : -1)) }
              : p
          )
        );
      }
    },
    [repostedIds, token]
  );

  // Reset and reload whenever the tab changes, when the parent signals a write
  // landed, or when sign-in state changes (which gates like state).
  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(false);
    load('initial', tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, refreshKey, token]);

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) =>
        // A shoutout is paid promotion and gets its own banner card, as on the
        // web, rather than looking like an ordinary post.
        item.isShoutout ? (
          <ShoutoutCard
            post={item}
            onPress={onOpenPost}
            // Refetch when a promotion ends: the backend stops pinning it, so
            // this brings the feed back in line without waiting for a manual
            // pull to refresh.
            onExpire={() => load('refresh', tab)}
          />
        ) : (
        <PostCard
          post={item}
          onPress={onOpenPost}
          onPressAuthor={onOpenProfile}
          onToggleLike={token ? toggleLike : undefined}
          onToggleRepost={token ? toggleRepost : undefined}
          onTip={token && onTip ? onTip : undefined}
          onReply={token && onReply ? onReply : undefined}
          liked={likedIds.has(item.id)}
          reposted={repostedIds.has(item.id)}
          currentWallet={currentWallet}
        />
        )
      }
      style={[styles.list, { backgroundColor: t.background }]}
      ListHeaderComponent={
        <>
          {header}
          {tab === 'trending' && posts.length > 0 && (
            <Text style={styles.trendingNote}>
              Posts people are liking, replying to and tipping.
            </Text>
          )}
        </>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.mint} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => load('initial', tab)} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: t.textTertiary }]}>
              {tab === 'trending' ? 'Nothing trending yet' : 'No posts yet'}
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={t.mint} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load('refresh', tab)}
          tintColor={t.mint}
        />
      }
      onEndReached={() => load('more', tab)}
      onEndReachedThreshold={0.5}
    />
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  list: { flex: 1, backgroundColor: theme.background },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: theme.textTertiary, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: theme.text },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 60,
    borderRadius: 2,
    backgroundColor: theme.mint,
  },
  trendingNote: {
    color: theme.textTertiary,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  center: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: theme.textTertiary, fontSize: 15 },
  errorText: { color: theme.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  retryText: { color: theme.mint, fontWeight: '600' },
  footer: { paddingVertical: 20 },
});
