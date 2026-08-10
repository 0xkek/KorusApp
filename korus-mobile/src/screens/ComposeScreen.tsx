import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { postsAPI } from '../api/posts';
import { SHOUTOUT_OPTIONS, shoutoutPrice } from '../api/shoutouts';
import { TREASURY_WALLET } from '../api/subscription';
import { isUserDeclined, sendSol } from '../wallet/solTransfer';
import { theme, useTheme } from '../theme';

const MAX_LENGTH = 500;

interface Props {
  token: string;
  /** Set when replying; omitted for a new top-level post. */
  replyToPostId?: string;
  /** Needed to pay for a shoutout; without it the option is hidden. */
  walletAddress?: string | null;
  onBack: () => void;
  onPosted: () => void;
}

export function ComposeScreen({
  token,
  replyToPostId,
  walletAddress,
  onBack,
  onPosted,
}: Props) {
  const t = useTheme();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = ordinary post. Replies cannot be promoted.
  const [shoutout, setShoutout] = useState<number | null>(null);
  const [orphanSignature, setOrphanSignature] = useState<string | null>(null);

  const isReply = Boolean(replyToPostId);
  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setOrphanSignature(null);

    try {
      if (replyToPostId) {
        await postsAPI.createReply(replyToPostId, trimmed, token);
        onPosted();
        return;
      }

      if (shoutout && walletAddress) {
        const price = shoutoutPrice(shoutout);
        if (!price) throw new Error('Unknown shoutout duration');

        // Pay first — the backend refuses to create the post without a
        // confirmed signature it can verify on mainnet.
        const signature = await sendSol({
          senderWallet: walletAddress,
          recipientWallet: TREASURY_WALLET,
          amountSol: price,
        });

        try {
          await postsAPI.createPost(
            { content: trimmed, shoutoutDuration: shoutout, transactionSignature: signature },
            token
          );
          onPosted();
        } catch (postErr) {
          // Paid but the post was not created. The SOL is gone; say so and
          // keep the signature visible rather than reporting a generic error.
          setOrphanSignature(signature);
          setError(
            postErr instanceof Error
              ? `Payment sent but the post was not created: ${postErr.message}`
              : 'Payment sent but the post was not created.'
          );
        }
        return;
      }

      await postsAPI.createPost({ content: trimmed }, token);
      onPosted();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(isUserDeclined(message) ? null : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.navbar, { borderBottomColor: t.border, backgroundColor: t.background }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: t.text }]}>{isReply ? 'Reply' : 'New post'}</Text>
        <Pressable onPress={submit} disabled={!canSubmit} hitSlop={12}>
          {busy ? (
            <ActivityIndicator color={t.mint} size="small" />
          ) : (
            <Text style={[styles.post, !canSubmit && styles.postDisabled]}>
              {isReply
                ? 'Reply'
                : shoutout
                  ? `Pay ${shoutoutPrice(shoutout)} SOL`
                  : 'Post'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Scrollable so the counter and the promote options stay reachable with
          the keyboard up. The window is set to adjustResize, so with a flex:1
          input everything below it was pushed off-screen. */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={isReply ? 'Write a reply…' : "What's happening?"}
          placeholderTextColor={t.textTertiary}
          multiline
          autoFocus
          style={styles.input}
        />

        <Text style={[styles.counter, trimmed.length > MAX_LENGTH && styles.counterOver]}>
          {trimmed.length}/{MAX_LENGTH}
        </Text>

        {orphanSignature ? (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>Paid, but not posted</Text>
            <Text style={styles.warningText}>
              Your SOL was sent but the post was not created. Keep this
              signature — it proves the payment.
            </Text>
            <Text style={styles.signature} selectable>
              {orphanSignature}
            </Text>
          </View>
        ) : null}

        {/* Replies cannot be promoted, and paying needs a wallet. */}
        {!isReply && walletAddress ? (
          <View style={styles.shoutout}>
            <View style={styles.shoutoutHeader}>
              <Text style={styles.shoutoutTitle}>Promote this post</Text>
              {shoutout ? (
                <Pressable onPress={() => setShoutout(null)} hitSlop={8}>
                  <Text style={styles.shoutoutClear}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.shoutoutHint}>
              Pins it to the top of the feed for a set time. Paid in SOL, on
              mainnet, and not refundable.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.options}>
                {SHOUTOUT_OPTIONS.map((o) => (
                  <Pressable
                    key={o.duration}
                    onPress={() => setShoutout(shoutout === o.duration ? null : o.duration)}
                    style={[styles.option, shoutout === o.duration && styles.optionActive]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        shoutout === o.duration && styles.optionLabelActive,
                      ]}
                    >
                      {o.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionPrice,
                        shoutout === o.duration && styles.optionLabelActive,
                      ]}
                    >
                      {o.priceSol} SOL
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}
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
  cancel: { color: theme.textTertiary, fontSize: 16 },
  navTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  post: { color: theme.mint, fontSize: 16, fontWeight: '700' },
  postDisabled: { color: theme.textTertiary },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  input: {
    // A minimum rather than flex:1 — flex made the input swallow the whole
    // scroll view and push the counter and promote options out of reach.
    minHeight: 140,
    color: theme.text,
    fontSize: 18,
    lineHeight: 25,
    textAlignVertical: 'top',
  },
  counter: { color: theme.textTertiary, fontSize: 13, textAlign: 'right' },
  counterOver: { color: theme.error },
  shoutout: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  shoutoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shoutoutTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  shoutoutClear: { color: theme.textTertiary, fontSize: 13 },
  shoutoutHint: {
    color: theme.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  options: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  optionActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)' },
  optionLabel: { color: theme.text, fontSize: 13, fontWeight: '600' },
  optionLabelActive: { color: '#f59e0b' },
  optionPrice: { color: theme.textTertiary, fontSize: 11, marginTop: 3 },
  warning: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningTitle: { color: '#f59e0b', fontWeight: '700', fontSize: 14 },
  warningText: { color: theme.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  signature: { color: theme.textTertiary, fontSize: 11, marginTop: 8 },
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
