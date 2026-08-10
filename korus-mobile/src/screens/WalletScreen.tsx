import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { rpc } from '../api/rpc';
import { notify } from '../notify';
import { theme } from '../theme';

interface Props {
  walletAddress: string;
  onBack: () => void;
}

export function WalletScreen({ walletAddress, onBack }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const res = await rpc.getBalance(walletAddress);
        setBalance((res.value ?? 0) / LAMPORTS_PER_SOL);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read balance');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Wallet</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={theme.mint}
          />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance</Text>
          {loading ? (
            <ActivityIndicator color={theme.mint} style={{ marginTop: 10 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.balance}>{balance?.toFixed(4) ?? '0.0000'} SOL</Text>
          )}
          <Text style={styles.network}>Solana mainnet</Text>
        </View>

        <Text style={styles.sectionLabel}>Your address</Text>
        <View style={styles.addressCard}>
          <Text style={styles.address} selectable>
            {walletAddress}
          </Text>
          {/* The address text above is selectable, so copy is covered without
              pulling in expo-clipboard and another native rebuild. */}
          <View style={styles.addressActions}>
            <Pressable
              onPress={() => Share.share({ message: walletAddress }).catch(() => {})}
              style={styles.addressButton}
            >
              <Text style={styles.addressButtonText}>Share address</Text>
            </Pressable>
          </View>
        </View>

        {/* Sending is deliberately absent: Korus never holds your keys, and a
            transfer here would duplicate what your wallet app already does
            better. Payments in-app (tips, premium, shoutouts) go through the
            wallet's own approval sheet. */}
        <Text style={styles.note}>
          Korus never holds your keys. To send SOL, use your wallet app — tips,
          premium and shoutouts are approved there too.
        </Text>
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
  content: { padding: 16 },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
  },
  balanceLabel: { color: theme.textTertiary, fontSize: 13 },
  balance: { color: theme.text, fontSize: 32, fontWeight: '800', marginTop: 6 },
  network: { color: theme.textTertiary, fontSize: 12, marginTop: 6 },
  error: { color: theme.error, fontSize: 13, marginTop: 10, textAlign: 'center' },
  sectionLabel: {
    color: theme.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  addressCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  address: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  addressActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  addressButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  addressButtonText: { color: theme.mint, fontWeight: '600', fontSize: 13 },
  note: {
    color: theme.textTertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 24,
    textAlign: 'center',
  },
});
