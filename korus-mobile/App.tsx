import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWalletAuth } from './src/wallet/useWalletAuth';
import { API_BASE_URL } from './src/api/client';

/**
 * Phase 1: prove the wallet path.
 *
 * Connect an installed Android wallet over Mobile Wallet Adapter, sign the
 * auth message, exchange it for a JWT from the live backend. Nothing else —
 * if this works, the rest of the app is ordinary building.
 */
export default function App() {
  const { walletAddress, token, user, isBusy, error, connectAndSignIn, signOut } =
    useWalletAuth();

  const signedIn = Boolean(token);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>K</Text>
        </View>

        <Text style={styles.title}>Korus</Text>
        <Text style={styles.subtitle}>Where community meets crypto</Text>

        {Platform.OS !== 'android' && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              Mobile Wallet Adapter is Android-only. Connecting will not work on
              this platform.
            </Text>
          </View>
        )}

        {!signedIn ? (
          <>
            <Pressable
              onPress={connectAndSignIn}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.button,
                (pressed || isBusy) && styles.buttonPressed,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Connect Wallet</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>
              Opens your wallet to approve, then asks for one signature. The
              signature proves the wallet is yours and costs nothing.
            </Text>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Signed in</Text>
            <Text style={styles.cardValue}>
              {walletAddress?.slice(0, 4)}…{walletAddress?.slice(-4)}
            </Text>

            {user?.username ? (
              <>
                <Text style={styles.cardLabel}>Username</Text>
                <Text style={styles.cardValue}>@{user.username}</Text>
              </>
            ) : null}

            <Text style={styles.cardLabel}>JWT</Text>
            <Text style={styles.mono} numberOfLines={3}>
              {token}
            </Text>

            <Pressable onPress={signOut} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>{API_BASE_URL}</Text>
      </ScrollView>
    </View>
  );
}

const MINT = '#43e97b';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 48, fontWeight: '800', color: '#000' },
  title: { fontSize: 40, fontWeight: '800', color: MINT, marginBottom: 6 },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 36,
    textAlign: 'center',
  },
  button: {
    backgroundColor: MINT,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.75 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
    lineHeight: 19,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(67,233,123,0.2)',
    borderRadius: 16,
    padding: 20,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginBottom: 4,
    marginTop: 12,
  },
  cardValue: { color: '#fff', fontSize: 17, fontWeight: '600' },
  mono: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  secondaryButton: {
    marginTop: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  secondaryButtonText: { color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  warning: {
    backgroundColor: 'rgba(234,179,8,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    maxWidth: 340,
  },
  warningText: { color: '#facc15', fontSize: 13, lineHeight: 19 },
  errorBox: {
    marginTop: 20,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 14,
    maxWidth: 340,
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 19 },
  footer: {
    marginTop: 40,
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
  },
});
