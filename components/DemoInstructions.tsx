import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';

export default function DemoInstructions({ onClose }: { onClose: () => void }) {
  const { colors, gradients } = useTheme();

  const testWallets = [
    {
      name: 'Demo Wallet 1',
      address: 'Demo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
      balance: '5000 ALLY'
    },
    {
      name: 'Demo Wallet 2', 
      address: 'Demo2L9uRqWJhMpRfO5fTlWIhgs7l7qWyAg1PtziBVser',
      balance: '5000 ALLY'
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.surface}
        style={styles.card}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          🎮 Try Korus - Hackathon Demo
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Option 1: Use Your Wallet
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Connect any Solana wallet (Phantom, Solflare, etc.)
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            You'll start with 5000 ALLY tokens to play with!
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Option 2: Demo Wallets
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            For quick testing, import these wallets:
          </Text>
          {testWallets.map((wallet, index) => (
            <View key={index} style={[styles.walletCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.walletName, { color: colors.text }]}>{wallet.name}</Text>
              <Text style={[styles.walletAddress, { color: colors.textTertiary }]}>
                {wallet.address.slice(0, 20)}...
              </Text>
              <Text style={[styles.walletBalance, { color: colors.primary }]}>{wallet.balance}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            What to Try:
          </Text>
          <Text style={[styles.bullet, { color: colors.textSecondary }]}>
            • Create a post with an image
          </Text>
          <Text style={[styles.bullet, { color: colors.textSecondary }]}>
            • Like and reply to posts
          </Text>
          <Text style={[styles.bullet, { color: colors.textSecondary }]}>
            • Challenge someone to a game
          </Text>
          <Text style={[styles.bullet, { color: colors.textSecondary }]}>
            • Send tips to great content
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <LinearGradient
            colors={gradients.primary}
            style={styles.closeButtonGradient}
          >
            <Text style={styles.closeButtonText}>Start Exploring</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  text: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  bullet: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  walletCard: {
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  walletName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  walletAddress: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.mono,
    marginTop: 2,
  },
  walletBalance: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000',
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
  },
});