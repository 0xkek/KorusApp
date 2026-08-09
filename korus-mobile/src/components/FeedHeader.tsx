import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { shortAddress } from '../api/types';
import { BellIcon, SearchIcon } from './Icons';
import { theme } from '../theme';

interface Props {
  walletAddress: string | null;
  signedIn: boolean;
  isBusy: boolean;
  error: string | null;
  onConnect: () => void;
  onSignOut: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onOpenSearch?: () => void;
  unreadCount?: number;
}

/**
 * Branding plus the connect/signed-in control, sitting above the feed.
 *
 * Reading the feed does not require a wallet, so this is a header rather than
 * a gate — a new user sees content first and connects when they want to act.
 */
export function FeedHeader({
  walletAddress,
  signedIn,
  isBusy,
  error,
  onConnect,
  onSignOut,
  onOpenProfile,
  onOpenNotifications,
  onOpenSearch,
  unreadCount = 0,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.title}>Korus</Text>
        </View>

        <View style={styles.actions}>
        {/* Search works signed out, so it is always available. */}
        {onOpenSearch ? (
          <Pressable
            onPress={onOpenSearch}
            hitSlop={10}
            style={styles.bell}
            accessibilityLabel="Search"
          >
            <SearchIcon color={theme.text} />
          </Pressable>
        ) : null}

        {signedIn && onOpenNotifications ? (
          <Pressable
            onPress={onOpenNotifications}
            hitSlop={10}
            style={styles.bell}
            accessibilityLabel="Notifications"
          >
            <BellIcon color={theme.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}

        {signedIn ? (
          // Tap opens your profile; sign-out is a long-press so a stray tap
          // can't drop the session and force another wallet round-trip.
          <Pressable
            onPress={onOpenProfile}
            // Confirmed because signing out is not cheap to undo — it costs a
            // full wallet round trip to get back in.
            onLongPress={() =>
              Alert.alert(
                'Disconnect wallet?',
                'You can keep reading Korus, but you will need to connect and sign again to post.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Disconnect', style: 'destructive', onPress: onSignOut },
                ]
              )
            }
            delayLongPress={500}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{shortAddress(walletAddress ?? '')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onConnect}
            disabled={isBusy}
            style={({ pressed }) => [styles.button, (pressed || isBusy) && styles.pressed]}
          >
            {isBusy ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </Pressable>
        )}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Signed out, the feed is still readable but every action is hidden.
          Say why, rather than leaving someone wondering where the buttons
          went — particularly right after a disconnect. */}
      {!signedIn && !error ? (
        <Pressable onPress={onConnect} disabled={isBusy} style={styles.notice}>
          <Text style={styles.noticeText}>
            You&apos;re browsing as a guest. Connect your wallet to post, reply,
            like and tip.
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: theme.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#000', fontWeight: '800', fontSize: 19 },
  title: { color: theme.mint, fontSize: 21, fontWeight: '800' },
  button: {
    backgroundColor: theme.mint,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 92,
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
  buttonText: { color: '#000', fontWeight: '700', fontSize: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bell: { padding: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
  error: { color: theme.error, fontSize: 13, marginTop: 8 },
  notice: {
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: 'rgba(67, 233, 123, 0.05)',
  },
  noticeText: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
});
