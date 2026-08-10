import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useWalletAuth } from './src/wallet/useWalletAuth';
import { FeedScreen } from './src/screens/FeedScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ComposeScreen } from './src/screens/ComposeScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { FeedHeader } from './src/components/FeedHeader';
import { TipModal } from './src/components/TipModal';
import { OfflineBanner } from './src/components/OfflineBanner';
import { useDeepLinks } from './src/useDeepLinks';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { PremiumScreen } from './src/screens/PremiumScreen';
import { GamesScreen } from './src/screens/GamesScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MenuDrawer } from './src/components/MenuDrawer';
import { TopTabs, type TopTab } from './src/components/TopTabs';
import { notificationsAPI } from './src/api/notifications';
import {
  usePushRegistration,
  useNotificationTap,
} from './src/notifications/usePushRegistration';
import type { Post } from './src/api/types';
import { theme } from './src/theme';

/** Screens are a small discriminated union — still simpler than a router. */
type Screen =
  | { name: 'feed' }
  | { name: 'post'; postId: string }
  | { name: 'profile'; walletAddress: string }
  | { name: 'compose'; replyToPostId?: string }
  | { name: 'editProfile' }
  | { name: 'notifications' }
  | { name: 'search' }
  | { name: 'premium' }
  | { name: 'wallet' }
  | { name: 'settings' };

/**
 * Minimal stack. Deliberately not expo-router yet — Phase 2 is three screens,
 * and a router is worth adding when there is navigation state worth modelling
 * (deep links, tabs), not before.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <KorusApp />
    </SafeAreaProvider>
  );
}

function KorusApp() {
  const auth = useWalletAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });
  // Bumped after any write so the feed refetches instead of showing stale data.
  const [refreshKey, setRefreshKey] = useState(0);
  // Post being tipped; the modal is open whenever this is set.
  const [tipTarget, setTipTarget] = useState<Post | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<TopTab>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  // Registers this device for push once signed in. No-ops cleanly until the
  // project is linked with `eas init` — see usePushRegistration.
  usePushRegistration(auth.token);

  // korus://post/<id> and https://korus.fun/post/<id>.
  useDeepLinks((target) => {
    if (target.type === 'post') setScreen({ name: 'post', postId: target.id });
    else setScreen({ name: 'profile', walletAddress: target.id });
  });

  // Tapping a push opens what it refers to.
  useNotificationTap((data) => {
    if (data?.postId) setScreen({ name: 'post', postId: String(data.postId) });
    else if (data?.fromUserId)
      setScreen({ name: 'profile', walletAddress: String(data.fromUserId) });
    else setScreen({ name: 'notifications' });
  });

  // Poll for unread notifications. There is no push registration endpoint on
  // the backend yet, so polling is the only way to surface these; 60s is a
  // compromise between freshness and battery.
  useEffect(() => {
    if (!auth.token) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await notificationsAPI.list(auth.token!, true);
        if (!cancelled) setUnreadCount(res.notifications?.length ?? 0);
      } catch {
        // Non-fatal — the badge just stays as it was.
      }
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auth.token, refreshKey]);
  // Signing out from a screen that needs auth (profile, notifications,
  // compose, edit profile) would otherwise leave it stranded and empty, so
  // drop back to the feed. Covers a background process kill too, since that
  // clears the token the same way.
  //
  // Only on an actual signed-in -> signed-out transition: firing on first
  // mount, where the token is legitimately null, would bump refreshKey and
  // make the feed fetch twice on launch.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (auth.token) {
      wasSignedIn.current = true;
      return;
    }
    if (wasSignedIn.current) {
      wasSignedIn.current = false;
      setScreen({ name: 'feed' });
      setTipTarget(null);
      setRefreshKey((k) => k + 1); // refetch as a signed-out viewer
    }
  }, [auth.token]);

  const insets = useSafeAreaInsets();
  const goFeed = () => setScreen({ name: 'feed' });

  const signOut = () => {
    // Clear the push token first — after signOut there is no token to
    // authenticate the call with, and otherwise this device keeps receiving
    // the previous account's pushes.
    if (auth.token) {
      notificationsAPI.unregisterPushToken(auth.token).catch(() => {});
    }
    auth.signOut();
  };

  // Shared by all four tabs so switching between them does not rebuild the
  // branding row.
  const tabHeader = (
    <>
      <FeedHeader
        walletAddress={auth.walletAddress}
        signedIn={Boolean(auth.token)}
        isBusy={auth.isBusy}
        error={auth.error}
        onConnect={auth.connectAndSignIn}
        onSignOut={signOut}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenNotifications={() => setScreen({ name: 'notifications' })}
        onOpenSearch={() => setScreen({ name: 'search' })}
        unreadCount={unreadCount}
      />
      <TopTabs active={tab} onChange={setTab} />
    </>
  );
  const afterWrite = () => {
    setRefreshKey((k) => k + 1);
    goFeed();
  };

  return (
    // edges omits 'bottom' so scrollable content runs under the gesture bar;
    // the FAB is lifted by the bottom inset instead.
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <OfflineBanner />
      <View style={styles.inner}>
        {screen.name === 'wallet' && auth.walletAddress ? (
          <WalletScreen walletAddress={auth.walletAddress} onBack={goFeed} />
        ) : screen.name === 'settings' && auth.token ? (
          <SettingsScreen
            token={auth.token}
            notificationsEnabled={auth.profile?.pushNotificationsEnabled ?? true}
            onBack={goFeed}
            onSignOut={() => {
              signOut();
              goFeed();
            }}
            onChanged={() => void auth.refreshProfile()}
          />
        ) : screen.name === 'premium' && auth.token && auth.walletAddress ? (
          <PremiumScreen
            token={auth.token}
            walletAddress={auth.walletAddress}
            onBack={goFeed}
            onSubscribed={() => {
              void auth.refreshProfile();
              setRefreshKey((k) => k + 1);
            }}
          />
        ) : screen.name === 'search' ? (
          // Public — searching does not require a wallet, same as reading.
          <SearchScreen
            onBack={goFeed}
            onOpenPost={(post) => setScreen({ name: 'post', postId: post.id })}
            onOpenProfile={(wallet) => setScreen({ name: 'profile', walletAddress: wallet })}
          />
        ) : screen.name === 'notifications' && auth.token ? (
          <NotificationsScreen
            token={auth.token}
            onBack={goFeed}
            onOpenPost={(postId) => setScreen({ name: 'post', postId })}
            onOpenProfile={(wallet) => setScreen({ name: 'profile', walletAddress: wallet })}
            onReadAll={() => setUnreadCount(0)}
          />
        ) : screen.name === 'compose' && auth.token ? (
          <ComposeScreen
            token={auth.token}
            replyToPostId={screen.replyToPostId}
            walletAddress={auth.walletAddress}
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
            // The pickers save on selection; refresh in place rather than
            // navigating away mid-edit.
            onChanged={() => {
              void auth.refreshProfile();
            }}
          />
        ) : screen.name === 'post' ? (
          <PostDetailScreen
            postId={screen.postId}
            onBack={goFeed}
            onOpenProfile={(wallet) => setScreen({ name: 'profile', walletAddress: wallet })}
            onReply={(id) => setScreen({ name: 'compose', replyToPostId: id })}
            onTip={(post) => setTipTarget(post)}
            token={auth.token}
            currentWallet={auth.walletAddress}
          />
        ) : screen.name === 'profile' ? (
          <ProfileScreen
            walletAddress={screen.walletAddress}
            onBack={goFeed}
            onOpenPost={(post) => setScreen({ name: 'post', postId: post.id })}
            isOwnProfile={Boolean(auth.token) && screen.walletAddress === auth.walletAddress}
            token={auth.token}
            onEditProfile={() => setScreen({ name: 'editProfile' })}
            onOpenPremium={() => setScreen({ name: 'premium' })}
          />
        ) : (
          // All four tabs share one header, so switching between them does not
          // flash the branding away and back.
          <>
            {tab === 'games' ? (
              <GamesScreen
                token={auth.token}
                currentWallet={auth.walletAddress}
                header={tabHeader}
                onOpenProfile={(wallet) =>
                  setScreen({ name: 'profile', walletAddress: wallet })
                }
              />
            ) : tab === 'events' ? (
              <EventsScreen token={auth.token} header={tabHeader} />
            ) : (
              // The feed is public — readable before signing in, same as the
              // web app, so a new user sees content rather than a wall.
              <FeedScreen
                onOpenPost={(post) => setScreen({ name: 'post', postId: post.id })}
                onOpenProfile={(wallet) =>
                  setScreen({ name: 'profile', walletAddress: wallet })
                }
                onReply={(post) => setScreen({ name: 'compose', replyToPostId: post.id })}
                onTip={(post) => setTipTarget(post)}
                token={auth.token}
                currentWallet={auth.walletAddress}
                refreshKey={refreshKey}
                feed={tab === 'trending' ? 'trending' : 'home'}
                header={tabHeader}
              />
            )}
          </>
        )}
      </View>

      {/* Compose is only reachable when signed in, and only from the feed. */}
      {screen.name === 'feed' && auth.token && (
        <Pressable
          onPress={() => setScreen({ name: 'compose' })}
          style={({ pressed }) => [
            styles.fab,
            { bottom: 28 + insets.bottom },
            pressed && styles.fabPressed,
          ]}
          accessibilityLabel="New post"
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      )}

      <MenuDrawer
        visible={menuOpen}
        profile={auth.profile}
        walletAddress={auth.walletAddress}
        signedIn={Boolean(auth.token)}
        onClose={() => setMenuOpen(false)}
        onNavigate={(destination) => {
          setMenuOpen(false);
          if (destination === 'profile' && auth.walletAddress) {
            setScreen({ name: 'profile', walletAddress: auth.walletAddress });
          } else if (destination === 'wallet') setScreen({ name: 'wallet' });
          else if (destination === 'settings') setScreen({ name: 'settings' });
          else if (destination === 'premium') setScreen({ name: 'premium' });
        }}
        onConnect={() => {
          setMenuOpen(false);
          auth.connectAndSignIn();
        }}
        onSignOut={() => {
          setMenuOpen(false);
          signOut();
        }}
      />

      <TipModal
        post={tipTarget}
        senderWallet={auth.walletAddress}
        token={auth.token}
        onClose={() => setTipTarget(null)}
        onTipped={() => setRefreshKey((k) => k + 1)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  inner: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
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
