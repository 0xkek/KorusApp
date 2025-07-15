import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';

export default function WelcomeScreen() {
  const router = useRouter();
  const { hasWallet, isLoading, createNewWallet, importFromSeedVault, walletAddress } = useWallet();
  const [checkingSeedVault, setCheckingSeedVault] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);

  // Auto-redirect if user already has wallet
  useEffect(() => {
    if (hasWallet && walletAddress && !isLoading) {
      router.replace('/(tabs)');
    }
  }, [hasWallet, walletAddress, isLoading]);

  // Auto-check for Seed Vault on mount
  useEffect(() => {
    checkForSeedVault();
  }, []);

  const checkForSeedVault = async () => {
    setCheckingSeedVault(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const hasSeedVault = await importFromSeedVault();
    
    if (hasSeedVault) {
      // Seed Vault found and imported
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      // No Seed Vault found
      setCheckingSeedVault(false);
    }
  };

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await createNewWallet();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCreatingWallet(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#0f0f0f', '#141414']}
          style={styles.background}
        />
        <ActivityIndicator size="large" color="#43e97b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0a0a0a', '#0f0f0f', '#141414']}
        style={styles.background}
      />
      
      {/* Green overlay */}
      <LinearGradient
        colors={[
          'rgba(67, 233, 123, 0.08)',
          'rgba(56, 249, 215, 0.05)',
          'transparent',
          'rgba(67, 233, 123, 0.06)',
          'rgba(56, 249, 215, 0.1)',
        ]}
        style={styles.greenOverlay}
      />

      <View style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Korus</Text>
          <Text style={styles.subtitle}>Decentralized Social on Solana</Text>
        </View>

        {/* Wallet Setup Card */}
        <BlurView intensity={40} style={styles.cardContainer}>
          <LinearGradient
            colors={['rgba(30, 30, 30, 0.95)', 'rgba(20, 20, 20, 0.98)']}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              {checkingSeedVault ? '🔍 Checking for Seed Vault...' : '👋 Welcome to Korus'}
            </Text>
            
            <Text style={styles.cardDescription}>
              {checkingSeedVault 
                ? 'Looking for your existing Solana wallet...'
                : 'To get started, you need a Solana wallet. This will be your identity on Korus.'
              }
            </Text>

            {!checkingSeedVault && (
              <>
                {/* Create New Wallet Button */}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCreateWallet}
                  disabled={creatingWallet}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#43e97b', '#38f9d7']}
                    style={styles.buttonGradient}
                  >
                    {creatingWallet ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create New Wallet</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Check Seed Vault Again */}
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={checkForSeedVault}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={25} style={styles.secondaryButtonBlur}>
                    <Text style={styles.secondaryButtonText}>Check Seed Vault Again</Text>
                  </BlurView>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  Your wallet is stored securely on your device.{'\n'}
                  Save your private key to recover your account.
                </Text>
              </>
            )}
          </LinearGradient>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: FontSizes['6xl'],
    fontFamily: Fonts.extraBold,
    color: '#43e97b',
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.4)',
  },
  card: {
    padding: 32,
    borderRadius: 24,
  },
  cardTitle: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardDescription: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  secondaryButtonBlur: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 16,
  },
});