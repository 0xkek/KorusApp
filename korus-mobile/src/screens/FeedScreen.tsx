import { useCallback, useEffect, useState } from 'react';
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
import { theme } from '../theme';

type Tab = 'home' | 'trending';

interface Props {
  onOpenPost: (post: Post) => void;
  onOpenProfile?: (walletAddress: string) => void;
  header?: React.ReactElement;
}

export function FeedScreen({ onOpenPost, onOpenProfile, header }: Props) {
  const [tab, setTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        } else {
          const res = await postsAPI.getPosts({
            limit: 20,
            cursor: mode === 'more' ? cursor ?? undefined : undefined,
          });
          setPosts((prev) => (mode === 'more' ? [...prev, ...res.posts] : res.posts));
          setCursor(res.meta?.nextCursor ?? null);
          setHasMore(res.meta?.hasMore ?? false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [cursor, hasMore, loadingMore, posts.length]
  );

  // Reset and reload whenever the tab changes.
  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(false);
    load('initial', tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard post={item} onPress={onOpenPost} onPressAuthor={onOpenProfile} />
      )}
      style={styles.list}
      ListHeaderComponent={
        <>
          {header}
          <View style={styles.tabs}>
            {(['home', 'trending'] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={styles.tab}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'home' ? 'Home' : 'Trending'}
                </Text>
                {tab === t && <View style={styles.tabUnderline} />}
              </Pressable>
            ))}
          </View>
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
            <ActivityIndicator color={theme.mint} />
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
            <Text style={styles.emptyText}>
              {tab === 'trending' ? 'Nothing trending yet' : 'No posts yet'}
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.mint} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load('refresh', tab)}
          tintColor={theme.mint}
        />
      }
      onEndReached={() => load('more', tab)}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
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
