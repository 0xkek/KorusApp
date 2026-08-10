import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { notificationsAPI } from '../api/notifications';
import { notify } from '../notify';
import { theme } from '../theme';

interface Props {
  token: string;
  /** Current value from the profile, so the switch starts in the right place. */
  notificationsEnabled: boolean;
  onBack: () => void;
  onSignOut: () => void;
  onChanged?: () => void;
}

export function SettingsScreen({
  token,
  notificationsEnabled,
  onBack,
  onSignOut,
  onChanged,
}: Props) {
  const [enabled, setEnabled] = useState(notificationsEnabled);
  const [busy, setBusy] = useState(false);

  async function toggleNotifications(next: boolean) {
    setEnabled(next); // optimistic — this is a preference, not money
    setBusy(true);
    try {
      await notificationsAPI.setEnabled(next, token);
      onChanged?.();
    } catch {
      setEnabled(!next);
      notify('Could not save that preference');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Push notifications</Text>
            <Text style={styles.rowHint}>
              Likes, replies, follows and tips. Turning this off stops them
              everywhere, including on the web.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            disabled={busy}
            trackColor={{ false: theme.border, true: theme.mint }}
            thumbColor="#fff"
          />
        </View>

        <Pressable
          style={styles.link}
          onPress={() => Linking.openSettings().catch(() => {})}
        >
          <Text style={styles.linkText}>Android notification settings</Text>
          <Text style={styles.linkHint}>
            System-level permissions for Korus
          </Text>
        </Pressable>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Version</Text>
            <Text style={styles.rowHint}>
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.link}
          onPress={() => Linking.openURL('https://korus.fun').catch(() => {})}
        >
          <Text style={styles.linkText}>korus.fun</Text>
        </Pressable>

        <Pressable
          style={styles.signOut}
          onPress={() =>
            Alert.alert(
              'Disconnect wallet?',
              'You can keep reading Korus, but you will need to connect and sign again to post.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: onSignOut },
              ]
            )
          }
        >
          <Text style={styles.signOutText}>Disconnect wallet</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
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
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    color: theme.textTertiary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    marginBottom: 10,
  },
  rowText: { flex: 1 },
  rowTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
  rowHint: { color: theme.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  link: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  linkText: { color: theme.mint, fontSize: 15, fontWeight: '600' },
  linkHint: { color: theme.textTertiary, fontSize: 12, marginTop: 3 },
  signOut: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.error,
    alignItems: 'center',
  },
  signOutText: { color: theme.error, fontSize: 15, fontWeight: '600' },
});
