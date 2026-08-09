import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { postsAPI } from '../api/posts';
import { usersAPI } from '../api/users';
import type { Post, UserProfile } from '../api/types';
import { resolveAvatarUrl, shortAddress } from '../api/types';
import { PostCard } from '../components/PostCard';
import { theme } from '../theme';

interface Props {
  walletAddress: string;
  onBack: () => void;
  onOpenPost: (post: Post) => void;
}

export function ProfileScreen({ walletAddress, onBack, onOpenPost }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Both are public. Settled rather than all() so a missing profile still
      // shows posts, and vice versa.
      const [profileRes, postsRes] = await Promise.allSettled([
        usersAPI.getUserByWallet(walletAddress),
        postsAPI.getUserPosts(walletAddress, { limit: 20 }),
      ]);
      if (cancelled) return;

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.user);
      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value.posts);
        setCursor(postsRes.value.meta?.nextCursor ?? null);
        setHasMore(postsRes.value.meta?.hasMore ?? false);
      }
      if (profileRes.status === 'rejected' && postsRes.status === 'rejected') {
        setError('Could not load this profile');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await postsAPI.getUserPosts(walletAddress, { limit: 20, cursor });
      setPosts((prev) => [...prev, ...res.posts]);
      setCursor(res.meta?.nextCursor ?? null);
      setHasMore(res.meta?.hasMore ?? false);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore, walletAddress]);

  // /api/user/by-wallet returns nftAvatar as a raw mint address, but the posts
  // endpoints return it already resolved to an image URL. Borrow the resolved
  // one from this user's own posts so the profile shows the same avatar the
  // feed does, instead of falling back to initials.
  const avatar =
    resolveAvatarUrl(profile?.nftAvatar) ??
    resolveAvatarUrl(posts.find((p) => p.author?.walletAddress === walletAddress)?.author?.nftAvatar);
  const name =
    profile?.displayName ||
    (profile?.username ? `@${profile.username}` : null) ||
    profile?.snsUsername ||
    shortAddress(walletAddress);

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={{ width: 54 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.mint} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} onPress={onOpenPost} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.identity}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>
                      {walletAddress.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.identityText}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    {profile?.tier === 'premium' && <Text style={styles.star}>★</Text>}
                  </View>
                  <Text style={styles.wallet}>{shortAddress(walletAddress)}</Text>
                </View>
              </View>

              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              <View style={styles.stats}>
                <Stat value={profile?.followerCount ?? 0} label="Followers" />
                <Stat value={profile?.followingCount ?? 0} label="Following" />
                <Stat value={profile?.reputationScore ?? 0} label="Reputation" />
              </View>

              {profile?.createdAt ? (
                <Text style={styles.joined}>
                  Joined{' '}
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              ) : null}

              <Text style={styles.postsHeader}>Posts</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={theme.mint} />
              </View>
            ) : null
          }
        />
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
  center: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  errorText: { color: theme.error, textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { color: theme.textTertiary, fontSize: 15 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    backgroundColor: theme.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 22 },
  identityText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: theme.text, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  star: { color: '#fbbf24', fontSize: 15 },
  wallet: { color: theme.textTertiary, fontSize: 13, marginTop: 2 },
  bio: { color: theme.textSecondary, fontSize: 15, lineHeight: 21, marginTop: 14 },
  stats: { flexDirection: 'row', gap: 28, marginTop: 18 },
  stat: { alignItems: 'flex-start' },
  statValue: { color: theme.text, fontSize: 17, fontWeight: '700' },
  statLabel: { color: theme.textTertiary, fontSize: 12, marginTop: 2 },
  joined: { color: theme.textTertiary, fontSize: 12, marginTop: 14 },
  postsHeader: {
    color: theme.textTertiary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
  },
  footer: { paddingVertical: 20 },
});
