import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { useWalletAuth } from './src/wallet/useWalletAuth';
import { FeedScreen } from './src/screens/FeedScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import { FeedHeader } from './src/components/FeedHeader';
import { theme } from './src/theme';

/**
 * Minimal stack. Deliberately not expo-router yet — Phase 2 is three screens,
 * and a router is worth adding when there is navigation state worth modelling
 * (deep links, tabs), not before.
 */
export default function App() {
  const auth = useWalletAuth();
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        {openPostId ? (
          <PostDetailScreen postId={openPostId} onBack={() => setOpenPostId(null)} />
        ) : (
          // The feed is public — readable before signing in, same as the web
          // app, so a new user sees content rather than a wall.
          <FeedScreen
            onOpenPost={(post) => setOpenPostId(post.id)}
            header={
              <FeedHeader
                walletAddress={auth.walletAddress}
                signedIn={Boolean(auth.token)}
                isBusy={auth.isBusy}
                error={auth.error}
                onConnect={auth.connectAndSignIn}
                onSignOut={auth.signOut}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

// react-native's SafeAreaView is deprecated and is a no-op for the top inset on
// Android, which let the status bar overlap the header. Padding by the measured
// status bar height fixes that without pulling in a native module (which would
// force a dev-client rebuild). iOS notches will want react-native-safe-area-context
// when we get there; on Android this is the correct inset.
const statusBarInset = Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background, paddingTop: statusBarInset },
  inner: { flex: 1 },
});
