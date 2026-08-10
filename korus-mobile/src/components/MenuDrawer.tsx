import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { resolveAvatarUrl, shortAddress } from '../api/types';
import type { UserProfile } from '../api/types';
import { theme, useTheme } from '../theme';

/**
 * Account menu.
 *
 * Holds the things that are *yours* — profile, wallet, settings — while the
 * top tabs hold browsable content. Splitting it that way keeps the tab row
 * readable: six tabs across the Seeker's 400dp would leave ~66dp each, too
 * tight to hit reliably.
 */

export type MenuDestination = 'profile' | 'wallet' | 'settings' | 'premium';

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  walletAddress: string | null;
  signedIn: boolean;
  onClose: () => void;
  onNavigate: (destination: MenuDestination) => void;
  onConnect: () => void;
  onSignOut: () => void;
}

export function MenuDrawer({
  visible,
  profile,
  walletAddress,
  signedIn,
  onClose,
  onNavigate,
  onConnect,
  onSignOut,
}: Props) {
  const t = useTheme();
  const slide = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 0 : -1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const avatar = resolveAvatarUrl(profile?.nftAvatar);
  const sns =
    profile?.snsUsername && profile.snsUsername !== '__wallet__'
      ? profile.snsUsername
      : null;
  const name = profile?.username
    ? `@${profile.username}`
    : sns ?? (walletAddress ? shortAddress(walletAddress) : 'Guest');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: [-1, 0],
                    outputRange: [-300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.panelInner} onPress={(e) => e.stopPropagation()}>
            {signedIn ? (
              <Pressable style={styles.identity} onPress={() => onNavigate('profile')}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>
                      {(walletAddress ?? '??').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.identityText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.meta}>
                    {profile?.followerCount ?? 0} followers
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.identity}>
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>?</Text>
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.name}>Guest</Text>
                  <Text style={styles.meta}>Not connected</Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {signedIn ? (
              <>
                <Item label="Profile" onPress={() => onNavigate('profile')} />
                <Item label="Wallet" onPress={() => onNavigate('wallet')} />
                <Item label="Premium" onPress={() => onNavigate('premium')} accent />
                <Item label="Settings" onPress={() => onNavigate('settings')} />
                <View style={styles.divider} />
                <Item label="Disconnect" onPress={onSignOut} muted />
              </>
            ) : (
              <>
                <Text style={styles.guestHint}>
                  Connect your wallet to post, reply, like and tip.
                </Text>
                <Pressable onPress={onConnect} style={styles.connect}>
                  <Text style={styles.connectText}>Connect wallet</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function Item({
  label,
  onPress,
  accent,
  muted,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Text
        style={[
          styles.itemText,
          accent && styles.itemAccent,
          muted && styles.itemMuted,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: { width: 280, height: '100%' },
  panelInner: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    backgroundColor: theme.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 16 },
  identityText: { flex: 1 },
  name: { color: theme.text, fontSize: 16, fontWeight: '700' },
  meta: { color: theme.textTertiary, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  item: { paddingVertical: 14 },
  itemPressed: { opacity: 0.6 },
  itemText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  itemAccent: { color: '#fbbf24' },
  itemMuted: { color: theme.textTertiary, fontWeight: '500' },
  guestHint: {
    color: theme.textTertiary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  connect: {
    backgroundColor: theme.mint,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
