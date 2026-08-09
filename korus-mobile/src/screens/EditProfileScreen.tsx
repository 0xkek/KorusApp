import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usersAPI, validateUsername } from '../api/users';
import type { UserProfile } from '../api/types';
import { theme } from '../theme';

interface Props {
  token: string;
  profile: UserProfile | null;
  /** Free accounts may set a username only once; premium may change it freely. */
  canSetUsername: boolean;
  onBack: () => void;
  onSaved: () => void;
}

export function EditProfileScreen({
  token,
  profile,
  canSetUsername,
  onBack,
  onSaved,
}: Props) {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [twitter, setTwitter] = useState(profile?.twitter ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameError = username.trim() ? validateUsername(username) : null;

  async function save() {
    setError(null);

    if (username.trim() && usernameError) {
      setError(usernameError);
      return;
    }

    // The backend 400s on a website without a scheme; catch it before the
    // round trip rather than after.
    if (website.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      setError('Website must start with http:// or https://');
      return;
    }

    setSaving(true);
    try {
      // Username is a separate, stricter endpoint and for free accounts is a
      // one-time change, so it is confirmed and sent on its own.
      if (username.trim()) {
        await usersAPI.setUsername(username.trim(), token);
      }

      // The backend ignores empty strings (value || undefined), so only send
      // fields that actually have content — clearing is not supported.
      const profileFields: Record<string, string> = {};
      if (bio.trim()) profileFields.bio = bio.trim();
      if (location.trim()) profileFields.location = location.trim();
      if (website.trim()) profileFields.website = website.trim();
      // The backend stores the handle without the @.
      if (twitter.trim()) profileFields.twitter = twitter.trim().replace(/^@/, '');

      if (Object.keys(profileFields).length > 0) {
        await usersAPI.updateProfile(profileFields, token);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  function confirmSave() {
    // Setting a username is irreversible on a free account, so make that
    // explicit before spending it.
    if (username.trim() && canSetUsername && profile?.tier !== 'premium') {
      Alert.alert(
        'Set username permanently?',
        `Your username will be @${username.trim()}.\n\nFree accounts can only set this once — it cannot be changed later without Premium.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set username', style: 'destructive', onPress: save },
        ]
      );
      return;
    }
    save();
  }

  const hasChanges =
    Boolean(username.trim()) ||
    bio.trim() !== (profile?.bio ?? '') ||
    location.trim() !== (profile?.location ?? '') ||
    website.trim() !== (profile?.website ?? '') ||
    twitter.trim() !== (profile?.twitter ?? '');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Edit profile</Text>
        <Pressable onPress={confirmSave} disabled={saving || !hasChanges} hitSlop={12}>
          {saving ? (
            <ActivityIndicator color={theme.mint} size="small" />
          ) : (
            <Text style={[styles.save, !hasChanges && styles.saveDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Username</Text>
        {profile?.username ? (
          <View style={styles.lockedRow}>
            <Text style={styles.lockedValue}>@{profile.username}</Text>
            {profile.tier !== 'premium' && (
              <Text style={styles.lockedNote}>Premium required to change</Text>
            )}
          </View>
        ) : (
          <>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="yourname"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              style={[styles.input, usernameError && styles.inputError]}
            />
            <Text style={usernameError ? styles.hintError : styles.hint}>
              {usernameError ??
                '3–20 letters and numbers. Free accounts can set this only once.'}
            </Text>
          </>
        )}

        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Say something about yourself"
          placeholderTextColor={theme.textTertiary}
          multiline
          maxLength={200}
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.hint}>{bio.length}/200</Text>

        <Text style={styles.label}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Where you are"
          placeholderTextColor={theme.textTertiary}
          maxLength={100}
          style={styles.input}
        />

        <Text style={styles.label}>Website</Text>
        <TextInput
          value={website}
          onChangeText={setWebsite}
          placeholder="https://yourwebsite.com"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={200}
          style={styles.input}
        />

        <Text style={styles.label}>X / Twitter</Text>
        <TextInput
          value={twitter}
          onChangeText={setTwitter}
          placeholder="username"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={50}
          style={styles.input}
        />

        <Text style={styles.footnote}>
          Fields can be changed but not cleared once set — that&apos;s a backend
          limitation, not a bug here.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  save: { color: theme.mint, fontSize: 16, fontWeight: '700' },
  saveDisabled: { color: theme.textTertiary },
  content: { padding: 16, paddingBottom: 40 },
  label: {
    color: theme.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 16,
  },
  inputError: { borderColor: theme.error },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  hint: { color: theme.textTertiary, fontSize: 12, marginTop: 6 },
  hintError: { color: theme.error, fontSize: 12, marginTop: 6 },
  error: {
    color: theme.error,
    fontSize: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.error,
  },
  lockedRow: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lockedValue: { color: theme.text, fontSize: 16, fontWeight: '600' },
  lockedNote: { color: theme.textTertiary, fontSize: 12, marginTop: 4 },
  footnote: { color: theme.textTertiary, fontSize: 12, marginTop: 28, lineHeight: 18 },
});
