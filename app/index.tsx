import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Text, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../context/WalletContext';
import { Fonts } from '../constants/Fonts';
import { logger } from '../utils/logger';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: walletLoading, walletAddress } = useWallet();
  
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Add a minimum display time for smooth transition
      const minDisplayTime = 800; // 0.8 seconds
      const startTime = Date.now();
      
      // Wait for both auth and wallet to finish loading
      const checkInterval = setInterval(() => {
        if (!authLoading && !walletLoading) {
          clearInterval(checkInterval);
          
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
          
          // Redirect after minimum display time
          setTimeout(() => {
            logger.log('Auth check complete - isAuthenticated:', isAuthenticated, 'walletAddress:', walletAddress);
            
            if (walletAddress) {
              // User has wallet (offline mode), go to main app
              logger.log('User has wallet, going to main app');
              router.replace('/(tabs)');
            } else {
              // User needs to create wallet, go to welcome
              logger.log('No wallet found, going to welcome');
              router.replace('/welcome');
            }
          }, remainingTime);
        }
      }, 50); // Check every 50ms
      
      // Cleanup on unmount
      return () => clearInterval(checkInterval);
    };
    
    checkAuthAndRedirect();
  }, [authLoading, walletLoading, isAuthenticated, walletAddress, router]);
  
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0a0a0a" barStyle="light-content" />
      <LinearGradient
        colors={['#0a0a0a', '#0f0f0f', '#141414']}
        style={styles.background}
      />
      
      {/* Green overlay */}
      <LinearGradient
        colors={[
          'rgba(74, 234, 188, 0.08)',
          'rgba(56, 207, 181, 0.05)',
          'transparent',
          'rgba(74, 234, 188, 0.06)',
          'rgba(56, 207, 181, 0.10)',
        ]}
        style={styles.greenOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#4AEABC', '#38CFB5', '#2BB4AE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>K</Text>
          </LinearGradient>
        </View>
        
        <Text style={styles.title}>Korus</Text>
        
        <ActivityIndicator 
          size="large" 
          color="#4AEABC" 
          style={styles.loader}
        />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#4AEABC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 80,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: -3,
    textAlign: 'center',
    lineHeight: 100,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  title: {
    fontSize: 48,
    fontFamily: Fonts.extraBold,
    color: '#4AEABC',
    textShadowColor: 'rgba(74, 234, 188, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: -2,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});