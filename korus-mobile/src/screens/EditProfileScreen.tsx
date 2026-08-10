import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { IdentityPicker } from '../components/IdentityPicker';
import { AvatarPicker } from '../components/AvatarPicker';
import type { UserProfile } from '../api/types';
import { resolveAvatarUrl } from '../api/types';
import { notify } from '../notify';
import { theme } from '../theme';

interface Props {
  token: string;
  profile: UserProfile | null;
  /** Free accounts may set a username only once; premium may change it freely. */
  canSetUsername: boolean;
  onBack: () => void;
  onSaved: () => void;
  /** Refresh the cached profile without leaving this screen — the pickers save
   *  immediately, and onSaved navigates away. */
  onChanged?: () => void;
}

export function EditProfileScreen({
  token,
  profile,
  canSetUsername,
  onBack,
  onSaved,
  onChanged,
}: Props) {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [twitter, setTwitter] = useState(profile?.twitter ?? '');
  // Identity and avatar save immediately on pick rather than waiting for Save —
  // they are single choices from a sheet, not free text being composed.
  const [snsUsername, setSnsUsername] = useState(profile?.snsUsername ?? '');
  const [nftAvatar, setNftAvatar] = useState(profile?.nftAvatar ?? '');
  const [showIdentity, setShowIdentity] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameError = username.trim() ? validateUsername(username) : null;
  // nftAvatar is a mint when we just saved one and a URL when it came back
  // resolved from the API, so only render it when it is actually an image.
  const avatarPreview = resolveAvatarUrl(nftAvatar);

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

  /**
   * Both pickers write a single field and close, so they save on the spot —
   * the Save button only governs the text fields. That is invisible unless we
   * say so, which made a saved avatar look like an unsaved one.
   */
  async function saveChoice(
    fields: Record<string, string>,
    confirmation: string,
    onDone: () => void
  ) {
    setError(null);
    try {
      await usersAPI.updateProfile(fields, token);
      onDone();
      notify(confirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that');
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
        {/* Stays tappable with nothing to save so it can explain itself —
            a dead button reads as "the app is broken". */}
        <Pressable
          onPress={
            hasChanges ? confirmSave : () => notify('Nothing to save — changes above save as you pick')
          }
          disabled={saving}
          hitSlop={12}
        >
          {saving ? (
            <ActivityIndicator color={theme.mint} size="small" />
          ) : (
            <Text style={[styles.save, !hasChanges && styles.saveDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Avatar · saves when you pick</Text>
        <Pressable onPress={() => setShowAvatar(true)} style={styles.pickerRow}>
          {avatarPreview ? (
            <Image source={{ uri: avatarPreview }} style={styles.avatarPreview} />
          ) : null}
          <Text style={styles.pickerValue}>
            {nftAvatar ? 'Tap to change' : 'None — tap to choose an NFT'}
          </Text>
          <Text style={styles.pickerChevron}>›</Text>
        </Pressable>

        <Text style={styles.label}>Display identity · saves when you pick</Text>
        <Pressable onPress={() => setShowIdentity(true)} style={styles.pickerRow}>
          <Text style={styles.pickerValue}>
            {profile?.username
              ? `@${profile.username}`
              : snsUsername && snsUsername !== '__wallet__'
                ? snsUsername
                : 'Wallet address'}
          </Text>
          <Text style={styles.pickerChevron}>›</Text>
        </Pressable>

        <Text style={styles.label}>Username</Text>
        {/* Premium can change the username freely; free accounts get one shot,
            so once set it is locked for them. Previously this locked it for
            everyone, including the premium users who had paid for exactly
            this. */}
        {profile?.username && profile.tier !== 'premium' ? (
          <View style={styles.lockedRow}>
            <Text style={styles.lockedValue}>@{profile.username}</Text>
            <Text style={styles.lockedNote}>Premium required to change</Text>
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
                (profile?.tier === 'premium'
                  ? '3–20 letters and numbers. Premium lets you change this any time.'
                  : '3–20 letters and numbers. Free accounts can set this only once.')}
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

      <IdentityPicker
        visible={showIdentity}
        walletAddress={profile?.walletAddress ?? ''}
        current={snsUsername}
        username={profile?.username ?? null}
        onClose={() => setShowIdentity(false)}
        onSelect={(value) =>
          saveChoice({ snsUsername: value }, 'Display identity saved', () => {
            setSnsUsername(value);
            setShowIdentity(false);
            onChanged?.();
          })
        }
      />

      <AvatarPicker
        visible={showAvatar}
        walletAddress={profile?.walletAddress ?? ''}
        currentMint={nftAvatar}
        onClose={() => setShowAvatar(false)}
        onSelect={(mint) =>
          saveChoice({ nftAvatar: mint }, 'Avatar saved', () => {
            setNftAvatar(mint);
            setShowAvatar(false);
            onChanged?.();
          })
        }
      />
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerValue: { color: theme.text, fontSize: 15, flex: 1 },
  avatarPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: theme.background,
  },
  pickerChevron: { color: theme.textTertiary, fontSize: 20 },
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
