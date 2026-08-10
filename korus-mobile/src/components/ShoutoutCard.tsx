import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Post } from '../api/types';
import { displayName } from '../api/types';
import { useTheme, type Theme } from '../theme';

/**
 * A shoutout is a paid, pinned post and gets its own card rather than the
 * normal one — matching korus-web, where it renders as a banner with a
 * countdown instead of a regular feed item.
 *
 * The countdown matters: a shoutout is bought by the minute, so showing the
 * time remaining is the whole point of paying for it.
 */

interface Props {
  post: Post;
  onPress?: (post: Post) => void;
  /** Fired once when the promotion ends, so the feed can unpin it. */
  onExpire?: (postId: string) => void;
}

export function ShoutoutCard({ post, onPress, onExpire }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const remaining = useCountdown(post.shoutoutExpiresAt);
  const expired = remaining === 'expired';

  // Tell the feed once, so it can stop pinning a promotion that has ended
  // rather than leaving it at the top indefinitely.
  const notified = useRef(false);
  useEffect(() => {
    if (expired && !notified.current) {
      notified.current = true;
      onExpire?.(post.id);
    }
  }, [expired, onExpire, post.id]);

  return (
    <Pressable
      onPress={() => onPress?.(post)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.megaphone}>📢</Text>

        <View style={styles.body}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>SHOUTOUT</Text>
            <Text style={styles.author} numberOfLines={1}>
              {displayName(post.author, post.authorWallet)}
            </Text>
          </View>
          <Text style={styles.content} numberOfLines={2}>
            {post.content}
          </Text>
        </View>

        {remaining ? (
          <View style={[styles.countdown, expired && styles.countdownExpired]}>
            <Text style={[styles.countdownText, expired && styles.countdownTextExpired]}>
              {expired ? 'Ended' : remaining}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Ticks once a second. Returns null when there is no expiry to count towards,
 * and 'expired' once it passes, so the caller can say so rather than silently
 * dropping the badge.
 *
 * Format matches korus-web: `1h 5m 30s`, `2m 15s`, `45s`.
 */
function useCountdown(expiresAt: string | null | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'expired';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.mint,
      // Tinted rather than solid, so it reads as promoted without shouting
      // over the rest of the feed.
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.03)',
    },
    pressed: { opacity: 0.8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    megaphone: { fontSize: 26 },
    body: { flex: 1 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    label: {
      color: theme.mint,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.5,
    },
    author: { color: theme.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
    content: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '500',
      marginTop: 4,
      lineHeight: 20,
    },
    countdown: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.mint,
    },
    countdownText: { color: theme.mint, fontSize: 12, fontWeight: '800' },
    countdownExpired: { borderColor: theme.textTertiary },
    countdownTextExpired: { color: theme.textTertiary },
  });
