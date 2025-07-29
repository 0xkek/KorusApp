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
import { WalletConnectionModal } from '../components/WalletConnectionModal';
import { TestWalletButton } from '../components/TestWalletButton';
import { ClearWalletButton } from '../components/ClearWalletButton';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isConnected, isLoading, walletAddress } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { signIn, isAuthenticated } = useAuth();
  const { showAlert } = useKorusAlert();

  // Auto-redirect if user is connected
  useEffect(() => {
    if (isConnected && !isLoading) {
      logger.log('User is connected, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isConnected, isLoading]);

  const handleConnectWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWalletModal(true);
  };

  const handleWalletConnected = () => {
    setShowWalletModal(false);
    router.replace('/(tabs)');
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
      {/* Background gradient - hardcoded dark */}
      <LinearGradient
        colors={['#1a1a1a', '#0f0f0f', '#1a1a1a']}
        style={styles.background}
      />
      
      {/* Green overlay - hardcoded */}
      <LinearGradient
        colors={[
          '#43e97b14',
          '#38f9d70C',
          'transparent',
          '#43e97b0F',
          '#38f9d71A',
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
              colors={['#43e97b', '#38f9d7']}
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
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#1a1a1a', '#0f0f0f', '#1a1a1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardTitleContainer}>
              <Ionicons 
                name="wallet-outline" 
                size={24} 
                color="#43e97b"
              />
              <Text style={styles.cardTitle}>Welcome to Korus</Text>
            </View>
            
            <Text style={styles.cardDescription}>
              Connect your Solana wallet to join Korus. Your wallet remains in your control - we never store your private keys.
            </Text>

            {/* Connect Wallet Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleConnectWallet}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#43e97b', '#38f9d7']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.primaryButtonText}>Connect Wallet</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              One account per wallet address.{'\n'}
              Secure, decentralized authentication.
            </Text>
            
            {/* Test button for debugging */}
            <TestWalletButton />
            
            {/* Clear wallet data */}
            <ClearWalletButton />
            
            {/* Simple direct connection button */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  const { connectWalletDirect } = await import('../utils/simpleMWA');
                  const result = await connectWalletDirect();
                  if (result.token) {
                    showAlert('Success', 'Wallet connected!', 'success');
                    router.replace('/(tabs)');
                  }
                } catch (error: any) {
                  logger.error('Simple connect error:', error);
                  showAlert('Error', error.message, 'error');
                }
              }}
              style={[styles.connectWalletButton, { marginTop: 10, backgroundColor: '#38f9d7' }]}
            >
              <Text style={styles.connectWalletText}>Simple Connect (Test)</Text>
            </TouchableOpacity>
            
            {/* Demo mode button */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  // Use a demo wallet for hackathon
                  const demoAddress = 'Demo' + Math.random().toString(36).substring(7);
                  const { authAPI } = await import('../utils/api');
                  const result = await authAPI.connectWallet(
                    demoAddress,
                    'demo_signature',
                    'demo_message'
                  );
                  if (result.token) {
                    showAlert('Demo Mode', 'Connected with demo wallet for testing', 'success');
                    setTimeout(() => {
                      router.replace('/(tabs)');
                    }, 1000);
                  }
                } catch (error: any) {
                  showAlert('Error', error.message, 'error');
                }
              }}
              style={[styles.connectWalletButton, { marginTop: 10, backgroundColor: '#666' }]}
            >
              <Text style={styles.connectWalletText}>Demo Mode (Hackathon)</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isVisible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSuccess={handleWalletConnected}
      />
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
    color: '#43e97b',
    textShadowColor: '#43e97b66',
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
    shadowColor: '#43e97b',
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
    borderColor: '#43e97b66',
    backgroundColor: '#0f0f0f',
    shadowColor: '#000000',
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