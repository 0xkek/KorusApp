import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { shortAddress } from '../api/types';
import { theme } from '../theme';

interface Props {
  walletAddress: string | null;
  signedIn: boolean;
  isBusy: boolean;
  error: string | null;
  onConnect: () => void;
  onSignOut: () => void;
  onOpenProfile?: () => void;
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

        {signedIn ? (
          // Tap opens your profile; sign-out is a long-press so a stray tap
          // can't drop the session and force another wallet round-trip.
          <Pressable
            onPress={onOpenProfile}
            onLongPress={onSignOut}
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

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: { color: theme.error, fontSize: 13, marginTop: 8 },
});
