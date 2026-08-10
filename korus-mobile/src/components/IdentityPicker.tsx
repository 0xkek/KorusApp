import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { identityAPI, WALLET_IDENTITY, type SNSDomain } from '../api/identity';
import { shortAddress } from '../api/types';
import { theme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  walletAddress: string;
  /** Current snsUsername value: a domain, '__wallet__', or null/''. */
  current: string | null;
  /** Set when a custom username exists — it takes precedence over SNS. */
  username: string | null;
  onClose: () => void;
  /** '' clears the SNS choice, '__wallet__' forces the address. */
  onSelect: (snsUsername: string) => void;
}

export function IdentityPicker({
  visible,
  walletAddress,
  current,
  username,
  onClose,
  onSelect,
}: Props) {
  const t = useTheme();
  const [domains, setDomains] = useState<SNSDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    identityAPI
      .getDomains(walletAddress)
      .then((res) => {
        if (!cancelled) setDomains(res.domains ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your .sol domains');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, walletAddress]);

  const usingWallet = current === WALLET_IDENTITY || (!current && !username);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: t.text }]}>Display identity</Text>
          <Text style={styles.subtitle}>
            How your name appears on posts. A custom username always wins if you
            have set one.
          </Text>

          <ScrollView style={[styles.list, { backgroundColor: t.background }]}>
            {username ? (
              <Row
                label={`@${username}`}
                detail="Your custom username — always used when set"
                selected={Boolean(username)}
                onPress={undefined}
              />
            ) : null}

            <Row
              label={shortAddress(walletAddress)}
              detail="Your wallet address"
              selected={usingWallet && !username}
              onPress={() => onSelect(WALLET_IDENTITY)}
            />

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={t.mint} />
              </View>
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : domains.length === 0 ? (
              <Text style={styles.empty}>
                No .sol domains in this wallet. Grab one at sns.id to use it here.
              </Text>
            ) : (
              domains.map((d) => (
                <Row
                  key={d.domain}
                  label={d.domain}
                  detail={d.favorite ? 'Your favourite domain' : 'SNS domain'}
                  selected={current === d.domain && !username}
                  onPress={() => onSelect(d.domain)}
                />
              ))
            )}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && onPress ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      {selected && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '80%',
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
  list: { marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  rowSelected: { borderColor: theme.mint, backgroundColor: 'rgba(67,233,123,0.06)' },
  rowPressed: { opacity: 0.7 },
  rowText: { flex: 1 },
  rowLabel: { color: theme.text, fontSize: 15, fontWeight: '600' },
  rowDetail: { color: theme.textTertiary, fontSize: 12, marginTop: 3 },
  check: { color: theme.mint, fontSize: 17, fontWeight: '800' },
  loading: { paddingVertical: 20, alignItems: 'center' },
  error: { color: theme.error, fontSize: 13, paddingVertical: 12 },
  empty: { color: theme.textTertiary, fontSize: 13, lineHeight: 19, paddingVertical: 12 },
  cancel: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: theme.textTertiary, fontSize: 14 },
});
