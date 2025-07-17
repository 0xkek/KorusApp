import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const { hasWallet, isLoading, createNewWallet, importFromSeedVault, walletAddress } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
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
          colors={gradients.surface}
          style={styles.background}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={gradients.surface}
        style={styles.background}
      />
      
      {/* Green overlay */}
      <LinearGradient
        colors={[
          colors.primary + '14',
          colors.secondary + '0C',
          'transparent',
          colors.primary + '0F',
          colors.secondary + '1A',
        ]}
        style={styles.greenOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
            colors={gradients.surface}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardTitleContainer}>
              {checkingSeedVault ? (
                <>
                  <Ionicons 
                    name="search" 
                    size={24} 
                    color={colors.primary}
                  />
                  <Text style={styles.cardTitle}>Checking for Seed Vault...</Text>
                </>
              ) : (
                <>
                  <Ionicons 
                    name="hand-left-outline" 
                    size={24} 
                    color={colors.primary}
                  />
                  <Text style={styles.cardTitle}>Welcome to Korus</Text>
                </>
              )}
            </View>
            
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
                    colors={gradients.primary}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {creatingWallet ? (
                      <ActivityIndicator color={isDarkMode ? '#000' : '#fff'} />
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

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
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
    color: colors.primary,
    textShadowColor: colors.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    marginTop: 8,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + '66',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
  },
  card: {
    padding: 32,
    borderRadius: 24,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
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
    color: isDarkMode ? '#000000' : '#ffffff',
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  secondaryButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});