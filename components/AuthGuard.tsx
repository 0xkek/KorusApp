import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  fallback 
}: AuthGuardProps) {
  const { walletAddress, isConnecting } = useWallet();
  const { colors, gradients } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // If auth is required and user is not authenticated, redirect to welcome
    if (requireAuth && !walletAddress && !isConnecting) {
      router.replace('/welcome');
    }
  }, [requireAuth, walletAddress, isConnecting]);

  // Show loading state while checking auth
  if (isConnecting) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Connecting wallet...
        </Text>
      </View>
    );
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !walletAddress) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.title, { color: colors.text }]}>
          Authentication Required
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Please connect your wallet to continue
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/welcome')}
        >
          <LinearGradient
            colors={gradients.primary}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonText}>Connect Wallet</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // User is authenticated or auth is not required
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
});