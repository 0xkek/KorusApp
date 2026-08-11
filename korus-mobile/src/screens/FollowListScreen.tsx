import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { followsAPI, type FollowUser } from '../api/follows';
import { UserRow } from '../components/UserRow';
import { useTheme, type Theme } from '../theme';

export type FollowTab = 'followers' | 'following';

interface Props {
  /** Whose lists these are. */
  walletAddress: string;
  /** Which tab to open on — the counts on the profile link to each. */
  initialTab: FollowTab;
  /** Shown in the title, e.g. "@korusxbt". Falls back to a generic heading. */
  displayName?: string | null;
  onBack: () => void;
  onOpenProfile: (walletAddress: string) => void;
}

const PAGE = 30;

export function FollowListScreen({
  walletAddress,
  initialTab,
  displayName,
  onBack,
  onOpenProfile,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [tab, setTab] = useState<FollowTab>(initialTab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (which: FollowTab, mode: 'initial' | 'more') => {
      if (mode === 'more' && (!hasMore || loadingMore)) return;
      if (mode === 'initial') {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = mode === 'more' ? users.length : 0;
        // Branch rather than a ternary: the two responses key their array
        // differently, and the union does not narrow across one expression.
        let batch: FollowUser[];
        let count: number;
        let more: boolean | undefined;

        if (which === 'followers') {
          const res = await followsAPI.getFollowers(walletAddress, { limit: PAGE, offset });
          batch = res.followers;
          count = res.count;
          more = res.hasMore;
        } else {
          const res = await followsAPI.getFollowing(walletAddress, { limit: PAGE, offset });
          batch = res.following;
          count = res.count;
          more = res.hasMore;
        }

        setUsers((prev) => (mode === 'more' ? [...prev, ...batch] : batch));
        setTotal(count ?? batch.length);
        // Older backends predate `hasMore`; fall back to a short page meaning
        // the end, so this screen still pages correctly against them.
        setHasMore(more ?? batch.length === PAGE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [walletAddress, users.length, hasMore, loadingMore]
  );

  // Reload from scratch whenever the tab changes.
  useEffect(() => {
    setUsers([]);
    setTotal(null);
    setHasMore(false);
    load(tab, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, walletAddress]);

  function switchTo(next: FollowTab) {
    if (next !== tab) setTab(next);
  }

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {displayName ?? 'Profile'}
        </Text>
        {/* Balances the back chevron so the title stays centred. */}
        <View style={styles.navSpacer} />
      </View>

      <View style={styles.tabs}>
        {(['followers', 'following'] as const).map((key) => (
          <Pressable key={key} onPress={() => switchTo(key)} style={styles.tab}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === 'followers' ? 'Followers' : 'Following'}
              {tab === key && total !== null ? ` · ${total}` : ''}
            </Text>
            {tab === key ? <View style={styles.tabUnderline} /> : null}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.walletAddress}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            onPress={() => onOpenProfile(item.walletAddress)}
            meta={`${item.followerCount ?? 0} followers`}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={t.mint} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => load(tab, 'initial')} style={styles.retry}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {tab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
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
        onEndReached={() => load(tab, 'more')}
        onEndReachedThreshold={0.5}
      />
    </View>
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
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    back: { color: theme.mint, fontSize: 30, fontWeight: '600', lineHeight: 34 },
    navTitle: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    navSpacer: { width: 18 },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 13 },
    tabText: { color: theme.textTertiary, fontSize: 15, fontWeight: '600' },
    tabTextActive: { color: theme.text },
    tabUnderline: {
      position: 'absolute',
      bottom: 0,
      height: 3,
      width: 70,
      borderRadius: 2,
      backgroundColor: theme.mint,
    },
    center: { paddingVertical: 60, alignItems: 'center', gap: 12 },
    emptyText: { color: theme.textTertiary, fontSize: 15 },
    errorText: {
      color: theme.error,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
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
