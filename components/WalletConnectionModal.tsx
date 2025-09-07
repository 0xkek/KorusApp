import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native';
import { useWallet } from '../context/WalletContext';
import { WalletProvider } from '../utils/walletConnectors';
import { logger } from '../utils/logger';
import { useKorusAlert } from './KorusAlertProvider';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface WalletConnectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const { connectWallet, disconnectWallet, availableWallets, isConnected, walletAddress, currentProvider } = useWallet();
  const { showAlert } = useKorusAlert();
  const { colors, isDarkMode, gradients } = useTheme();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(null);
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const handleWalletConnect = async (provider: WalletProvider) => {
    try {
      setIsConnecting(true);
      setSelectedProvider(provider);
      
      const success = await connectWallet(provider);
      
      if (success) {
        // Success alert is already shown by the auth hook
        onSuccess?.();
        onClose();
      } else {
        showAlert('Connection Failed', 'Failed to connect wallet. Please try again.', 'error');
      }
    } catch (error: any) {
      logger.error('Wallet connection error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('declined') || error.message?.includes('cancelled')) {
        showAlert('Authentication Required', 'Please approve the signature request to connect your wallet.', 'warning');
      } else if (error.message?.includes('Failed to sign')) {
        showAlert('Signature Failed', 'Unable to authenticate. Please try again and approve the signature request.', 'error');
      } else {
        showAlert('Connection Error', error.message || 'An error occurred while connecting your wallet.', 'error');
      }
    } finally {
      setIsConnecting(false);
      setSelectedProvider(null);
    }
  };

  const handleNewToWallets = () => {
    showAlert(
      'Get Started with Wallets',
      'To use Korus, you need a Solana wallet. We recommend Seed Vault for Seeker users, or Phantom for general use.',
      'info',
      [
        {
          text: 'Get Seed Vault',
          onPress: () => {
            // Link to Seed Vault/Solana Mobile info
            Linking.openURL('https://solanamobile.com');
          },
        },
        {
          text: 'Get Phantom',
          onPress: () => {
            const url = Platform.OS === 'ios' 
              ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
              : 'https://play.google.com/store/apps/details?id=app.phantom';
            Linking.openURL(url);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDisconnect = () => {
    showAlert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet? You will need to reconnect to use Korus.',
      'warning',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectWallet();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.modal}>
          <BlurView intensity={40} style={styles.blurContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#0f0f0f', '#1a1a1a']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.handle} />
          
              <Text style={styles.title}>
                {isConnected ? 'Wallet Settings' : 'Connect Wallet'}
              </Text>
              <Text style={styles.subtitle}>
                {isConnected ? 'Manage your wallet connection' : 'Choose a wallet to connect to Korus'}
              </Text>

              {isConnected ? (
                <View>
                  <View style={styles.connectedCard}>
                    <Text style={styles.connectedLabel}>Connected Wallet</Text>
                    <Text style={styles.walletAddress}>
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </Text>
                    {currentProvider && (
                      <Text style={styles.providerName}>
                        via {currentProvider.displayName}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleDisconnect}
                    style={styles.disconnectButton}
                  >
                    <Text style={styles.disconnectText}>
                      Disconnect Wallet
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : availableWallets.length === 0 && !isConnecting ? (
                <View>
                  <Text style={styles.noWalletsText}>
                    No wallets detected. Please install a Solana wallet to continue.
                  </Text>
                  <TouchableOpacity
                    onPress={handleNewToWallets}
                    style={styles.newToWalletsButton}
                  >
                    <LinearGradient
                      colors={['#43e97b', '#38f9d7']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.newToWalletsText}>
                        I&apos;m New to Wallets
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* Seed Vault - Primary Button */}
                  <TouchableOpacity
                    onPress={() => {
                      const seedVault = availableWallets.find(w => w.name === 'seedvault');
                      if (seedVault) {
                        handleWalletConnect(seedVault);
                      }
                    }}
                    disabled={isConnecting}
                    style={[styles.primaryWalletOption, isConnecting && styles.walletOptionDisabled]}
                  >
                    <LinearGradient
                      colors={['#43e97b', '#38f9d7']}
                      style={styles.primaryWalletGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.primaryWalletIcon}>🔐</Text>
                      <View style={styles.walletInfo}>
                        <Text style={styles.primaryWalletName}>Seed Vault</Text>
                        <Text style={styles.primaryWalletDescription}>Recommended for Seeker users</Text>
                      </View>
                      {isConnecting && selectedProvider?.name === 'seedvault' && (
                        <ActivityIndicator color={'#000000'} size="small" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Connect Other Wallet Button */}
                  <TouchableOpacity
                    onPress={() => {
                      const phantom = availableWallets.find(w => w.name === 'phantom');
                      if (phantom) {
                        handleWalletConnect(phantom);
                      } else {
                        showAlert('No Wallets Found', 'Please install a Solana wallet app like Phantom to continue.', 'info');
                      }
                    }}
                    style={styles.otherWalletsButton}
                    disabled={isConnecting}
                  >
                    <Text style={styles.otherWalletsText}>Connect Other Wallets</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleNewToWallets}
                    style={styles.getStartedLink}
                  >
                    <Text style={styles.getStartedText}>
                      Don&apos;t have a wallet? Get started →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={onClose}
                disabled={isConnecting}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#43e97b66',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 32,
    paddingBottom: 40,
  },
  handle: {
    width: 60,
    height: 5,
    backgroundColor: '#43e97b80',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: '#ffffff', // Hardcoded white for visibility
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: '#a0a0a0', // Hardcoded gray for visibility
    marginBottom: 24,
  },
  connectedCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 0,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  connectedLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999999',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: FontSizes.sm,
    fontFamily: 'Courier',
    color: '#ffffff',
    marginBottom: 8,
  },
  providerName: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999999',
  },
  disconnectButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  noWalletsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: '#a0a0a0', // Hardcoded gray for visibility
    textAlign: 'center',
    marginBottom: 16,
  },
  newToWalletsButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  newToWalletsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#000000', // Hardcoded black for green gradient button
  },
  walletOption: {
    backgroundColor: '#1a1a1a',
    borderWidth: 0,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletOptionDisabled: {
    opacity: 0.5,
  },
  walletIcon: {
    fontSize: 30,
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
  },
  walletDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999999',
    marginTop: 2,
  },
  getStartedLink: {
    paddingVertical: 12,
  },
  getStartedText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#a0a0a0', // Hardcoded gray for visibility
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
  },
  cancelText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
    textAlign: 'center',
  },
  primaryWalletOption: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  primaryWalletGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryWalletIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  primaryWalletName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000000', // Hardcoded black for green gradient button
    marginBottom: 4,
  },
  primaryWalletDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(0,0,0,0.7)', // Hardcoded dark gray for green gradient button
  },
  otherWalletsButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#43e97b30',
  },
  otherWalletsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#43e97b',
  },
  otherWalletsContainer: {
    marginBottom: 16,
  },
  otherWalletsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  otherWalletsLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: '#999999',
  },
  noOtherWalletsContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  noOtherWalletsText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  noOtherWalletsSubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999999',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#43e97b30',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999999',
  },
  walletNote: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999999',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});