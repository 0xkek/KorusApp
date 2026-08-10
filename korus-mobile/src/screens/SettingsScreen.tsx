import { useState, useMemo} from 'react';
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
import { usersAPI } from '../api/users';
import { notify } from '../notify';
// `theme` is the static fallback used by StyleSheet.create, which cannot read
// context; live colours are applied inline from `t`.
import { useTheme, useThemeControls, type ThemeMode , type Theme } from '../theme';

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
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { mode, setMode } = useThemeControls();

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
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <View style={[styles.navbar, { borderBottomColor: t.border }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={[styles.back, { color: t.mint }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: t.text }]}>Settings</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Appearance</Text>
        <View style={styles.modes}>
          {(['system', 'light', 'dim', 'dark'] as ThemeMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m); // apply immediately
                // Persisted on the account, not the device — so it follows you
                // and nothing is stored locally.
                usersAPI
                  .updateProfile({ themeMode: m }, token)
                  .then(() => onChanged?.())
                  .catch(() => notify('Could not save that preference'));
              }}
              style={[
                styles.mode,
                { borderColor: t.border },
                mode === m && { borderColor: t.mint, backgroundColor: t.surface },
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  { color: t.textTertiary },
                  mode === m && { color: t.mint, fontWeight: '700' },
                ]}
              >
                {m === 'system'
                  ? 'System'
                  : m === 'light'
                    ? 'Light'
                    : m === 'dim'
                      ? 'Dim'
                      : 'Dark'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.rowHint, { color: t.textTertiary, marginBottom: 10 }]}>
          {mode === 'system'
            ? // Without this, System is indistinguishable from whichever mode
              // the phone happens to be on, and looks like it did nothing.
              `Following your phone, which is currently ${t.isDark ? 'dark' : 'light'}. Android has no dim setting, so System uses Dark.`
            : mode === 'dim'
              ? 'A softer, lifted dark. Easier over long sessions.'
              : `Always ${mode}, ignoring your phone's setting.`}
        </Text>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Notifications</Text>
        <View style={[styles.row, { borderColor: t.border, backgroundColor: t.surface }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: t.text }]}>Push notifications</Text>
            <Text style={[styles.rowHint, { color: t.textTertiary }]}>
              Likes, replies, follows and tips. Turning this off stops them
              everywhere, including on the web.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            disabled={busy}
            trackColor={{ false: t.border, true: t.mint }}
            thumbColor="#fff"
          />
        </View>

        <Pressable
          style={[styles.link, { borderColor: t.border }]}
          onPress={() => Linking.openSettings().catch(() => {})}
        >
          <Text style={[styles.linkText, { color: t.mint }]}>Android notification settings</Text>
          <Text style={[styles.linkHint, { color: t.textTertiary }]}>
            System-level permissions for Korus
          </Text>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>About</Text>
        <View style={[styles.row, { borderColor: t.border, backgroundColor: t.surface }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: t.text }]}>Version</Text>
            <Text style={[styles.rowHint, { color: t.textTertiary }]}>
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.link, { borderColor: t.border }]}
          onPress={() => Linking.openURL('https://korus.fun').catch(() => {})}
        >
          <Text style={[styles.linkText, { color: t.mint }]}>korus.fun</Text>
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
  // 2x2 rather than a single row — four options across 400dp would be ~90dp
  // each with padding, too tight to read comfortably.
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeText: { fontSize: 13, fontWeight: '600' },
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
