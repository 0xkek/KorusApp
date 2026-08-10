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
import { notificationsAPI, type Notification } from '../api/notifications';
import { relativeTime, shortAddress } from '../api/types';
import { LikeIcon, ReplyIcon, TipIcon } from '../components/Icons';
import { theme, useTheme } from '../theme';

const LIKE_COLOR = '#ef4444';
const TIP_COLOR = '#f59e0b';

interface Props {
  token: string;
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenProfile: (walletAddress: string) => void;
  /** Lets the parent clear its unread badge once these are read. */
  onReadAll?: () => void;
}

export function NotificationsScreen({
  token,
  onBack,
  onOpenPost,
  onOpenProfile,
  onReadAll,
}: Props) {
  const t = useTheme();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const res = await notificationsAPI.list(token);
        setItems(res.notifications ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load notifications');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const markAllRead = useCallback(async () => {
    // Optimistic — this is cosmetic, and a failure costs nothing.
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onReadAll?.();
    try {
      await notificationsAPI.markAllRead(token);
    } catch {
      // Non-fatal.
    }
  }, [token, onReadAll]);

  const open = useCallback(
    async (item: Notification) => {
      if (!item.read) {
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
        notificationsAPI.markRead(item.id, token).catch(() => {});
      }
      // A follow has no post to open, so it goes to the follower's profile.
      if (item.postId) onOpenPost(item.postId);
      else if (item.fromUser?.walletAddress) onOpenProfile(item.fromUser.walletAddress);
    },
    [token, onOpenPost, onOpenProfile]
  );

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <View style={[styles.navbar, { borderBottomColor: t.border, backgroundColor: t.background }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={[styles.back, { color: t.mint }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: t.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={12}>
            <Text style={styles.readAll}>Read all</Text>
          </Pressable>
        ) : (
          <View style={{ width: 58 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.mint} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={t.mint}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: t.textTertiary }]}>
                {error ?? 'Nothing yet. Likes, replies and follows show up here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [
                styles.row,
                !item.read && styles.rowUnread,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.icon}>
                <NotificationIcon type={item.type} />
              </View>
              <View style={styles.body}>
                <Text style={styles.text}>{notificationText(item)}</Text>
                {item.post?.content ? (
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.post.content}
                  </Text>
                ) : null}
                <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function NotificationIcon({ type }: { type: string }) {
  const t = useTheme();
  if (type === 'like') return <LikeIcon size={20} color={LIKE_COLOR} fill={LIKE_COLOR} />;
  if (type === 'reply') return <ReplyIcon size={20} color={t.mint} />;
  if (type === 'tip') return <TipIcon size={20} color={TIP_COLOR} />;
  // follow and the game types fall through to a neutral marker.
  return <View style={styles.genericIcon} />;
}

/**
 * The backend stores `message` without a subject ("liked your post"), and
 * fromUser carries only a wallet address, so prepend the sender to make each
 * line a complete sentence.
 */
function notificationText(item: Notification): string {
  const who = item.fromUser?.walletAddress
    ? shortAddress(item.fromUser.walletAddress)
    : null;
  const amount =
    item.type === 'tip' && item.amount ? ` (${Number(item.amount)} SOL)` : '';
  return who ? `${who} ${item.message}${amount}` : `${item.title}${amount}`;
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
  readAll: { color: theme.mint, fontSize: 14, fontWeight: '600' },
  center: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { color: theme.textTertiary, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowUnread: { backgroundColor: 'rgba(67, 233, 123, 0.04)' },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  icon: { width: 24, alignItems: 'center', paddingTop: 2 },
  genericIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.mint,
  },
  body: { flex: 1 },
  text: { color: theme.text, fontSize: 15, lineHeight: 21 },
  preview: { color: theme.textTertiary, fontSize: 13, marginTop: 4 },
  time: { color: theme.textTertiary, fontSize: 12, marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.mint,
    marginTop: 6,
  },
});
