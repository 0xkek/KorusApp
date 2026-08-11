import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveAvatarUrl, shortAddress } from '../api/types';
import { useTheme, type Theme } from '../theme';

/**
 * One user in a list — search results, followers, following.
 *
 * Extracted from SearchScreen when the follow lists needed the same row.
 * The trailing metric is the only thing that varies between callers, so it is
 * passed in rather than branched on here.
 */

/** The fields every user-list endpoint returns; a structural type so search
 *  results and follow lists both satisfy it without a shared nominal type. */
export interface ListUser {
  walletAddress: string;
  username: string | null;
  snsUsername: string | null;
  nftAvatar: string | null;
  themeColor: string | null;
  tier: string | null;
  bio: string | null;
}

interface Props {
  user: ListUser;
  onPress: () => void;
  /** Right-aligned metric, e.g. "12 posts" or "40 followers". Optional. */
  meta?: string;
}

export function UserRow({ user, onPress, meta }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const avatar = resolveAvatarUrl(user.nftAvatar);
  // Same precedence as everywhere else: username, then SNS, then wallet.
  const sns =
    user.snsUsername && user.snsUsername !== '__wallet__' ? user.snsUsername : null;
  const name = user.username ? `@${user.username}` : sns ?? shortAddress(user.walletAddress);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.avatarFallback,
            { backgroundColor: user.themeColor ?? t.mint },
          ]}
        >
          <Text style={styles.avatarText}>
            {user.walletAddress.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {user.tier === 'premium' && <Text style={styles.star}>★</Text>}
        </View>
        {user.bio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {user.bio}
          </Text>
        ) : (
          <Text style={styles.meta}>{shortAddress(user.walletAddress)}</Text>
        )}
      </View>

      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowPressed: { opacity: 0.7 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#0a0a0a', fontWeight: '800', fontSize: 15 },
    body: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { color: theme.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
    star: { color: '#f59e0b', fontSize: 13 },
    bio: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
    meta: { color: theme.textTertiary, fontSize: 12 },
  });
