import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchAPI, type SearchUser } from '../api/search';
import type { Post } from '../api/types';
import { resolveAvatarUrl, shortAddress } from '../api/types';
import { PostCard } from '../components/PostCard';
import { theme, useTheme } from '../theme';

type Tab = 'posts' | 'people';

interface Props {
  onBack: () => void;
  onOpenPost: (post: Post) => void;
  onOpenProfile: (walletAddress: string) => void;
}

export function SearchScreen({ onBack, onOpenPost, onOpenProfile }: Props) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Guards against an earlier, slower request overwriting a later one.
  const requestId = useRef(0);

  const run = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setPosts([]);
      setUsers([]);
      setSearched(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      // One call returns both — no need to hit /search/users separately.
      const res = await searchAPI.search(trimmed);
      if (id !== requestId.current) return;
      setPosts(res.posts ?? []);
      setUsers(res.users ?? []);
      setSearched(true);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // Debounced so typing does not fire a request per keystroke; the endpoint
  // is rate limited.
  useEffect(() => {
    const timer = setTimeout(() => run(query), 350);
    return () => clearTimeout(timer);
  }, [query, run]);

  const results = tab === 'posts' ? posts : users;

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <View style={[styles.navbar, { borderBottomColor: t.border, backgroundColor: t.background }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={[styles.back, { color: t.mint }]}>‹</Text>
        </Pressable>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search posts and people"
          placeholderTextColor={t.textTertiary}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => run(query)}
          style={styles.input}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={12}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {searched && (
        <View style={styles.tabs}>
          {(['posts', 'people'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={styles.tab}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'posts' ? `Posts (${posts.length})` : `People (${users.length})`}
              </Text>
              {tab === t && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </View>
      )}

      {loading && results.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.mint} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={[styles.hint, { color: t.textTertiary }]}>Find posts, usernames and .sol domains.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.hint, { color: t.textTertiary }]}>
            No {tab} matching “{query.trim()}”.
          </Text>
        </View>
      ) : tab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <PostCard post={item} onPress={onOpenPost} onPressAuthor={onOpenProfile} />
          )}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.walletAddress}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <UserRow user={item} onPress={() => onOpenProfile(item.walletAddress)} />
          )}
        />
      )}
    </View>
  );
}

function UserRow({ user, onPress }: { user: SearchUser; onPress: () => void }) {
  const t = useTheme();
  const avatar = resolveAvatarUrl(user.nftAvatar);
  // Same precedence as everywhere else: username, then SNS, then wallet.
  const sns =
    user.snsUsername && user.snsUsername !== '__wallet__' ? user.snsUsername : null;
  const name = user.username ? `@${user.username}` : sns ?? shortAddress(user.walletAddress);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.userAvatar} />
      ) : (
        <View
          style={[
            styles.userAvatar,
            styles.userAvatarFallback,
            { backgroundColor: user.themeColor ?? t.mint },
          ]}
        >
          <Text style={styles.userAvatarText}>
            {user.walletAddress.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.userBody}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {name}
          </Text>
          {user.tier === 'premium' && <Text style={styles.star}>★</Text>}
        </View>
        {user.bio ? (
          <Text style={styles.userBio} numberOfLines={1}>
            {user.bio}
          </Text>
        ) : (
          <Text style={styles.userMeta}>{shortAddress(user.walletAddress)}</Text>
        )}
      </View>
      <Text style={styles.userMeta}>{user.postCount ?? 0} posts</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  back: { color: theme.mint, fontSize: 26, fontWeight: '600' },
  input: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 15,
  },
  clear: { color: theme.textTertiary, fontSize: 16 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  tabText: { color: theme.textTertiary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: theme.text },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 60,
    borderRadius: 2,
    backgroundColor: theme.mint,
  },
  center: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 32 },
  hint: { color: theme.textTertiary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText: { color: theme.error, fontSize: 14, textAlign: 'center' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  userRowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  userAvatar: { width: 42, height: 42, borderRadius: 21 },
  userAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#000', fontWeight: '700', fontSize: 14 },
  userBody: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userName: { color: theme.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  star: { color: '#fbbf24', fontSize: 12 },
  userBio: { color: theme.textTertiary, fontSize: 13, marginTop: 2 },
  userMeta: { color: theme.textTertiary, fontSize: 12 },
});
