import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWalletAuth } from './src/wallet/useWalletAuth';
import { FeedScreen } from './src/screens/FeedScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ComposeScreen } from './src/screens/ComposeScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { FeedHeader } from './src/components/FeedHeader';
import { theme } from './src/theme';

/** Screens are a small discriminated union — still simpler than a router. */
type Screen =
  | { name: 'feed' }
  | { name: 'post'; postId: string }
  | { name: 'profile'; walletAddress: string }
  | { name: 'compose'; replyToPostId?: string }
  | { name: 'editProfile' };

/**
 * Minimal stack. Deliberately not expo-router yet — Phase 2 is three screens,
 * and a router is worth adding when there is navigation state worth modelling
 * (deep links, tabs), not before.
 */
export default function App() {
  const auth = useWalletAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });
  // Bumped after any write so the feed refetches instead of showing stale data.
  const [refreshKey, setRefreshKey] = useState(0);
  const goFeed = () => setScreen({ name: 'feed' });
  const afterWrite = () => {
    setRefreshKey((k) => k + 1);
    goFeed();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        {screen.name === 'compose' && auth.token ? (
          <ComposeScreen
            token={auth.token}
            replyToPostId={screen.replyToPostId}
            onBack={goFeed}
            onPosted={afterWrite}
          />
        ) : screen.name === 'editProfile' && auth.token ? (
          <EditProfileScreen
            token={auth.token}
            profile={auth.profile}
            canSetUsername={!auth.profile?.username}
            onBack={goFeed}
            onSaved={async () => {
              await auth.refreshProfile();
              afterWrite();
            }}
          />
        ) : screen.name === 'post' ? (
          <PostDetailScreen
            postId={screen.postId}
            onBack={goFeed}
            onOpenProfile={(wallet) => setScreen({ name: 'profile', walletAddress: wallet })}
            onReply={(id) => setScreen({ name: 'compose', replyToPostId: id })}
            token={auth.token}
          />
        ) : screen.name === 'profile' ? (
          <ProfileScreen
            walletAddress={screen.walletAddress}
            onBack={goFeed}
            onOpenPost={(post) => setScreen({ name: 'post', postId: post.id })}
            isOwnProfile={Boolean(auth.token) && screen.walletAddress === auth.walletAddress}
            token={auth.token}
            onEditProfile={() => setScreen({ name: 'editProfile' })}
          />
        ) : (
          // The feed is public — readable before signing in, same as the web
          // app, so a new user sees content rather than a wall.
          <FeedScreen
            onOpenPost={(post) => setScreen({ name: 'post', postId: post.id })}
            onOpenProfile={(wallet) => setScreen({ name: 'profile', walletAddress: wallet })}
            onReply={(post) => setScreen({ name: 'compose', replyToPostId: post.id })}
            token={auth.token}
            refreshKey={refreshKey}
            header={
              <FeedHeader
                walletAddress={auth.walletAddress}
                signedIn={Boolean(auth.token)}
                isBusy={auth.isBusy}
                error={auth.error}
                onConnect={auth.connectAndSignIn}
                onSignOut={auth.signOut}
                onOpenProfile={
                  auth.walletAddress
                    ? () => setScreen({ name: 'profile', walletAddress: auth.walletAddress! })
                    : undefined
                }
              />
            }
          />
        )}
      </View>

      {/* Compose is only reachable when signed in, and only from the feed. */}
      {screen.name === 'feed' && auth.token && (
        <Pressable
          onPress={() => setScreen({ name: 'compose' })}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          accessibilityLabel="New post"
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      )}
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.mint,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabPressed: { opacity: 0.8 },
  fabIcon: { color: '#000', fontSize: 32, fontWeight: '300', lineHeight: 36 },
});
