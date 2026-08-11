import { useCallback, useEffect, useState, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { followsAPI } from '../api/follows';
import { postsAPI } from '../api/posts';
import { usersAPI } from '../api/users';
import type { Post, UserProfile } from '../api/types';
import { resolveAvatarUrl, shortAddress } from '../api/types';
import { PostCard } from '../components/PostCard';
import { useTheme , type Theme } from '../theme';

interface Props {
  walletAddress: string;
  onBack: () => void;
  onOpenPost: (post: Post) => void;
  /** Signed-in user viewing themselves — gates the profile-setup note. */
  isOwnProfile?: boolean;
  token?: string | null;
  onEditProfile?: () => void;
  onOpenPremium?: () => void;
  /** Opens the follower/following list. Omit to leave the counts inert. */
  onOpenFollows?: (tab: 'followers' | 'following') => void;
}

export function ProfileScreen({
  walletAddress,
  onBack,
  onOpenPost,
  isOwnProfile,
  token,
  onEditProfile,
  onOpenPremium,
  onOpenFollows,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
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

  // Whether the signed-in user already follows this profile.
  useEffect(() => {
    if (!token || isOwnProfile) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await followsAPI.checkFollowing([walletAddress], token);
        if (!cancelled) setFollowing(Boolean(res.following?.[walletAddress]));
      } catch {
        // Non-fatal — the button just starts as "Follow".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, walletAddress, isOwnProfile]);

  const toggleFollow = useCallback(async () => {
    if (!token || followBusy) return;
    setFollowBusy(true);
    const previous = following;
    setFollowing(!previous); // optimistic
    try {
      const res = await followsAPI.toggleFollow(walletAddress, token);
      setFollowing(res.following); // server's resulting state wins
      setProfile((p) =>
        p
          ? {
              ...p,
              followerCount: Math.max(
                0,
                (p.followerCount ?? 0) + (res.following ? 1 : -1)
              ),
            }
          : p
      );
    } catch {
      setFollowing(previous);
    } finally {
      setFollowBusy(false);
    }
  }, [token, walletAddress, following, followBusy]);

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
  // Identity is username, then SNS handle, then the wallet — the same
  // precedence the web uses. The displayName column exists in the database but
  // the product never renders it, so it is deliberately not consulted here.
  //
  // '__wallet__' is a sentinel meaning "show my wallet address", not a name.
  const sns =
    profile?.snsUsername && profile.snsUsername !== '__wallet__'
      ? profile.snsUsername
      : null;
  const chosenName =
    (profile?.username ? `@${profile.username}` : null) || sns || null;
  const name = chosenName ?? 'Unnamed';

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <View style={[styles.navbar, { borderBottomColor: t.border, backgroundColor: t.background }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={[styles.back, { color: t.mint }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: t.text }]}>Profile</Text>
        <View style={{ width: 54 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.mint} />
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
                    <Text
                      style={[styles.name, !chosenName && styles.nameUnset]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    {profile?.tier === 'premium' && <Text style={styles.star}>★</Text>}
                  </View>
                  <Text style={styles.wallet}>{shortAddress(walletAddress)}</Text>
                </View>
              </View>

              {isOwnProfile && token ? (
                <View style={styles.ownActions}>
                  <Pressable
                    onPress={onEditProfile}
                    style={[styles.secondaryButton, styles.flex1]}
                  >
                    <Text style={styles.secondaryButtonText}>Edit profile</Text>
                  </Pressable>
                  <Pressable
                    onPress={onOpenPremium}
                    style={[styles.secondaryButton, styles.flex1, styles.premiumButton]}
                  >
                    <Text style={styles.premiumButtonText}>
                      {profile?.tier === 'premium' ? '★ Premium' : 'Go Premium'}
                    </Text>
                  </Pressable>
                </View>
              ) : token ? (
                <Pressable
                  onPress={toggleFollow}
                  disabled={followBusy}
                  style={[styles.followButton, following && styles.followingButton]}
                >
                  {followBusy ? (
                    <ActivityIndicator size="small" color={following ? t.text : '#000'} />
                  ) : (
                    <Text
                      style={[
                        styles.followButtonText,
                        following && styles.followingButtonText,
                      ]}
                    >
                      {following ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </Pressable>
              ) : null}

              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              {/* Only present on your own profile — the public by-wallet
                  endpoint does not return these. */}
              {profile?.location || profile?.website || profile?.twitter ? (
                <View style={styles.meta}>
                  {profile.location ? (
                    <Text style={styles.metaItem}>{profile.location}</Text>
                  ) : null}
                  {profile.website ? (
                    <Text style={styles.metaLink}>{profile.website}</Text>
                  ) : null}
                  {profile.twitter ? (
                    <Text style={styles.metaLink}>@{profile.twitter}</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Editing is a write (PUT /api/user/profile) and lands in Phase 3.
                  Until then say so, rather than leaving a new account looking
                  broken with no name, no avatar and nothing to do. */}
              {isOwnProfile && !chosenName ? (
                <Text style={styles.setupNote}>
                  You haven&apos;t set a username or avatar yet. Editing your profile
                  isn&apos;t in the mobile app yet — you can set it on korus.fun and it
                  will show up here.
                </Text>
              ) : null}

              <View style={styles.stats}>
                <Stat
                  value={profile?.followerCount ?? 0}
                  label="Followers"
                  onPress={onOpenFollows ? () => onOpenFollows('followers') : undefined}
                />
                <Stat
                  value={profile?.followingCount ?? 0}
                  label="Following"
                  onPress={onOpenFollows ? () => onOpenFollows('following') : undefined}
                />
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
              <Text style={[styles.emptyText, { color: t.textTertiary }]}>No posts yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={t.mint} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

/** Pressable when `onPress` is given — reputation has no list behind it. */
function Stat({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const body = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (!onPress) return <View style={styles.stat}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
    >
      {body}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
  nameUnset: { color: theme.textTertiary, fontWeight: '600' },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  secondaryButtonText: { color: theme.text, fontWeight: '600', fontSize: 14 },
  ownActions: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  premiumButton: { borderColor: '#fbbf24' },
  premiumButtonText: { color: '#fbbf24', fontWeight: '700', fontSize: 14 },
  followButton: {
    marginTop: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: theme.mint,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  followButtonText: { color: '#000', fontWeight: '700', fontSize: 14 },
  followingButtonText: { color: theme.text },
  bio: { color: theme.textSecondary, fontSize: 15, lineHeight: 21, marginTop: 14 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  metaItem: { color: theme.textTertiary, fontSize: 13 },
  metaLink: { color: theme.mint, fontSize: 13 },
  setupNote: {
    color: theme.textTertiary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  stats: { flexDirection: 'row', gap: 28, marginTop: 18 },
  stat: { alignItems: 'flex-start' },
  statPressed: { opacity: 0.6 },
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
