import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { postsAPI } from '../api/posts';
import { theme } from '../theme';

const MAX_LENGTH = 500;

interface Props {
  token: string;
  /** Set when replying; omitted for a new top-level post. */
  replyToPostId?: string;
  onBack: () => void;
  onPosted: () => void;
}

export function ComposeScreen({ token, replyToPostId, onBack, onPosted }: Props) {
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = Boolean(replyToPostId);
  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (replyToPostId) {
        await postsAPI.createReply(replyToPostId, trimmed, token);
      } else {
        await postsAPI.createPost({ content: trimmed }, token);
      }
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.navTitle}>{isReply ? 'Reply' : 'New post'}</Text>
        <Pressable onPress={submit} disabled={!canSubmit} hitSlop={12}>
          {busy ? (
            <ActivityIndicator color={theme.mint} size="small" />
          ) : (
            <Text style={[styles.post, !canSubmit && styles.postDisabled]}>
              {isReply ? 'Reply' : 'Post'}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={isReply ? 'Write a reply…' : "What's happening?"}
          placeholderTextColor={theme.textTertiary}
          multiline
          autoFocus
          style={styles.input}
        />

        <Text style={[styles.counter, trimmed.length > MAX_LENGTH && styles.counterOver]}>
          {trimmed.length}/{MAX_LENGTH}
        </Text>
      </View>
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
  cancel: { color: theme.textTertiary, fontSize: 16 },
  navTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  post: { color: theme.mint, fontSize: 16, fontWeight: '700' },
  postDisabled: { color: theme.textTertiary },
  body: { flex: 1, padding: 16 },
  input: {
    flex: 1,
    color: theme.text,
    fontSize: 18,
    lineHeight: 25,
    textAlignVertical: 'top',
  },
  counter: { color: theme.textTertiary, fontSize: 13, textAlign: 'right' },
  counterOver: { color: theme.error },
  error: {
    color: theme.error,
    fontSize: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.error,
  },
});
