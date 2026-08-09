import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { identityAPI, type WalletNFT } from '../api/identity';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  walletAddress: string;
  /**
   * The profile's stored nftAvatar. Depending on the endpoint this is either
   * the mint address or an already-resolved image URL, so selection is matched
   * on both rather than assuming one form.
   */
  currentMint: string | null;
  onClose: () => void;
  /** Receives the NFT's mint address — that is what the backend stores. */
  onSelect: (mint: string) => void;
}

export function AvatarPicker({
  visible,
  walletAddress,
  currentMint,
  onClose,
  onSelect,
}: Props) {
  const [nfts, setNfts] = useState<WalletNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    identityAPI
      .getNFTs(walletAddress)
      .then((res) => {
        // Only NFTs with an image are usable as an avatar.
        if (!cancelled) setNfts((res.nfts ?? []).filter((n) => n.image));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load NFTs from this wallet');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, walletAddress]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose an avatar</Text>
          <Text style={styles.subtitle}>NFTs held by this wallet.</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.mint} />
              <Text style={styles.hint}>Reading your wallet…</Text>
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : nfts.length === 0 ? (
            <Text style={styles.empty}>
              No NFTs with artwork found in this wallet.
            </Text>
          ) : (
            <FlatList
              data={nfts}
              keyExtractor={(item) => item.mint}
              numColumns={3}
              columnWrapperStyle={styles.column}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item.mint)}
                  style={({ pressed }) => [
                    styles.tile,
                    (currentMint === item.mint || currentMint === item.image) &&
                      styles.tileSelected,
                    pressed && styles.tilePressed,
                  ]}
                >
                  <Image source={{ uri: item.image }} style={styles.image} />
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          )}

          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Close</Text>
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
    paddingBottom: 30,
    maxHeight: '82%',
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
  subtitle: { color: theme.textTertiary, fontSize: 13, marginTop: 6 },
  center: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  hint: { color: theme.textTertiary, fontSize: 13 },
  error: { color: theme.error, fontSize: 13, paddingVertical: 20 },
  empty: { color: theme.textTertiary, fontSize: 13, paddingVertical: 20, lineHeight: 19 },
  grid: { paddingTop: 16 },
  column: { gap: 10, marginBottom: 10 },
  tile: {
    flex: 1 / 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 6,
  },
  tileSelected: { borderColor: theme.mint, backgroundColor: 'rgba(67,233,123,0.06)' },
  tilePressed: { opacity: 0.7 },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: theme.background,
  },
  name: { color: theme.textTertiary, fontSize: 11, marginTop: 6 },
  cancel: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: theme.textTertiary, fontSize: 14 },
});
