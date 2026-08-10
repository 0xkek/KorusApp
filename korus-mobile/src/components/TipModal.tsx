import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Post } from '../api/types';
import { displayName } from '../api/types';
import { useTip } from '../wallet/useTip';
import { theme, useTheme } from '../theme';

const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.5];
const TIP_COLOR = '#f59e0b';

interface Props {
  post: Post | null;
  senderWallet: string | null;
  token: string | null;
  onClose: () => void;
  onTipped: (amount: number) => void;
}

export function TipModal({ post, senderWallet, token, onClose, onTipped }: Props) {
  const t = useTheme();
  const { sendTip, isSending, error, clearError } = useTip();
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [sentSignature, setSentSignature] = useState<string | null>(null);

  const amount = selected ?? Number(custom);
  const validAmount = Number.isFinite(amount) && amount > 0;

  async function submit() {
    if (!post || !senderWallet || !token || !validAmount) return;
    const result = await sendTip({
      postId: post.id,
      recipientWallet: post.authorWallet,
      amountSol: amount,
      senderWallet,
      token,
    });
    if (result?.recordedOnBackend) {
      onTipped(amount);
      reset();
      onClose();
    } else if (result) {
      // Sent on-chain but not recorded — keep the modal open so the signature
      // stays visible rather than vanishing with the error.
      setSentSignature(result.signature);
    }
  }

  function reset() {
    setSelected(null);
    setCustom('');
    setSentSignature(null);
    clearError();
  }

  function close() {
    if (isSending) return; // don't dismiss mid-signature
    reset();
    onClose();
  }

  return (
    <Modal
      visible={Boolean(post)}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: t.text }]}>
            Tip {post ? displayName(post.author, post.authorWallet) : ''}
          </Text>
          <Text style={styles.subtitle}>
            Sends real SOL from your wallet on mainnet. This cannot be undone.
          </Text>

          {sentSignature ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>SOL sent, tip not recorded</Text>
              <Text style={styles.warningText}>
                The transfer went through on-chain but Korus could not record it.
                Your SOL has moved. Signature:
              </Text>
              <Text style={styles.signature} selectable>
                {sentSignature}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.presets}>
                {PRESET_AMOUNTS.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setSelected(value);
                      setCustom('');
                      clearError();
                    }}
                    style={[styles.preset, selected === value && styles.presetActive]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        selected === value && styles.presetTextActive,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={custom}
                onChangeText={(text) => {
                  setCustom(text.replace(/[^0-9.]/g, ''));
                  setSelected(null);
                  clearError();
                }}
                placeholder="Custom amount"
                placeholderTextColor={t.textTertiary}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={submit}
                disabled={!validAmount || isSending}
                style={[styles.send, (!validAmount || isSending) && styles.sendDisabled]}
              >
                {isSending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.sendText}>
                    Send {validAmount ? amount : ''} SOL
                  </Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable onPress={close} disabled={isSending} style={styles.cancel}>
            <Text style={styles.cancelText}>{sentSignature ? 'Close' : 'Cancel'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.textTertiary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { color: theme.text, fontSize: 19, fontWeight: '700' },
  subtitle: { color: theme.textTertiary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  presets: { flexDirection: 'row', gap: 10, marginTop: 20 },
  preset: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  presetActive: { backgroundColor: TIP_COLOR, borderColor: TIP_COLOR },
  presetText: { color: theme.text, fontWeight: '600', fontSize: 14 },
  presetTextActive: { color: '#000' },
  input: {
    marginTop: 12,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 16,
  },
  send: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: TIP_COLOR,
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#000', fontWeight: '700', fontSize: 15 },
  cancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: theme.textTertiary, fontSize: 14 },
  error: {
    color: theme.error,
    fontSize: 13,
    marginTop: 14,
    lineHeight: 18,
  },
  warning: {
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TIP_COLOR,
  },
  warningTitle: { color: TIP_COLOR, fontWeight: '700', fontSize: 14 },
  warningText: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  signature: { color: theme.textTertiary, fontSize: 11, marginTop: 8 },
});
