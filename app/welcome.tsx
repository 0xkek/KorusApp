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
import { useAuth } from '../hooks/useAuth';
import { useKorusAlert } from '../components/KorusAlertProvider';
import { getErrorMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export default function WelcomeScreen() {
  const router = useRouter();
  const { hasWallet, isLoading, createNewWallet, importFromSeedVault, walletAddress } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [checkingSeedVault, setCheckingSeedVault] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const { signIn, isAuthenticated } = useAuth();
  const { showAlert } = useKorusAlert();

  // Auto-redirect if user has wallet
  useEffect(() => {
    if (walletAddress && !isLoading) {
      logger.log('User has wallet, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [walletAddress, isLoading]);

  // Auto-check for Seed Vault on mount
  useEffect(() => {
    checkForSeedVault();
  }, []);

  const checkForSeedVault = async () => {
    setCheckingSeedVault(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const hasSeedVault = await importFromSeedVault();
      
      if (hasSeedVault) {
        // Seed Vault found and imported, now authenticate
        try {
          // In mock mode, use dummy signature
          const message = `Sign in to Korus\n\nTimestamp: ${Date.now()}`;
          const signature = 'mock_signature_' + Date.now();
          
          await signIn(signature, message);
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)');
        } catch (authError) {
          const errorMessage = getErrorMessage(authError);
          showAlert({
            title: 'Authentication Failed',
            message: errorMessage,
            type: 'error'
          });
          setCheckingSeedVault(false);
        }
      } else {
        // No Seed Vault found
        setCheckingSeedVault(false);
      }
    } catch (error) {
      setCheckingSeedVault(false);
      const errorMessage = getErrorMessage(error);
      showAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error'
      });
    }
  };

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const success = await createNewWallet();
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Force navigation regardless of state
        setCreatingWallet(false);
        router.replace('/(tabs)');
      } else {
        throw new Error('Failed to create wallet');
      }
    } catch (error) {
      setCreatingWallet(false);
      const errorMessage = getErrorMessage(error);
      showAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error'
      });
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>K</Text>
            </LinearGradient>
          </View>
          <Text style={styles.title}>Korus</Text>
          <Text style={styles.subtitle}>Radical Authenticity</Text>
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
                    name="wallet-outline" 
                    size={24} 
                    color={colors.primary}
                  />
                  <Text style={styles.cardTitle}>Connecting to Seed Vault...</Text>
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
                ? 'Accessing your Solana Mobile Seed Vault...'
                : 'Create a new wallet or use your Solana Mobile Seed Vault for secure, device-bound authentication.'
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

                {/* Connect Seed Vault */}
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={checkForSeedVault}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={25} style={styles.secondaryButtonBlur}>
                    <Text style={styles.secondaryButtonText}>Use Seed Vault</Text>
                  </BlurView>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  Seed Vault ensures one account per device.{'\n'}
                  Available on Solana Mobile phones only.
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
    fontSize: 56,
    fontFamily: Fonts.extraBold,
    color: colors.primary,
    textShadowColor: colors.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: -2,
    marginTop: -10,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    color: colors.textSecondary,
    marginTop: 8,
  },
  logoContainer: {
    marginBottom: 30,
    marginTop: -40,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 100,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: -4,
    textAlign: 'center',
    lineHeight: 120,
    includeFontPadding: false,
    textAlignVertical: 'center',
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