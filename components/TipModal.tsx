import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';

interface TipModalProps {
  visible: boolean;
  onClose: () => void;
  onTip: (amount: number, event?: any) => void;
  username: string;
  walletBalance: number;
}

export default function TipModal({ visible, onClose, onTip, username, walletBalance }: TipModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [tipAmount, setTipAmount] = useState('');

  // Check if entered amount exceeds balance
  const enteredAmount = parseFloat(tipAmount) || 0;
  const isInsufficient = enteredAmount > walletBalance;
  const isValidAmount = enteredAmount > 0 && !isInsufficient;

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const numericValue = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return; // Don't update if more than one decimal point
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    }
    
    const cleanValue = parts.join('.');
    setTipAmount(cleanValue);
  };

  const handleTip = (event?: any) => {
    if (isValidAmount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Trigger particle explosion at button location
      if (event && global.createParticleExplosion) {
        const touch = event.nativeEvent;
        global.createParticleExplosion('tip', touch.pageX || 200, touch.pageY || 300);
      }
      
      onTip(enteredAmount, event);
      setTipAmount('');
      onClose();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    setTipAmount('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <BlurView intensity={60} style={styles.modalContainer}>
          <LinearGradient
            colors={[
              'rgba(30, 30, 30, 0.95)',
              'rgba(20, 20, 20, 0.98)',
              'rgba(15, 15, 15, 0.99)',
            ]}
            style={styles.modalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>💰 Tip {username}</Text>
              <Text style={styles.subtitle}>Enter amount in $ALLY tokens</Text>
              <Text style={styles.balanceText}>
                Balance: {walletBalance.toFixed(2)} $ALLY
              </Text>
            </View>

            {/* Tip Amount Input */}
            <View style={styles.inputContainer}>
              <BlurView intensity={25} style={styles.inputBlur}>
                <LinearGradient
                  colors={['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']}
                  style={styles.inputGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.currencySymbol}>$ALLY</Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      isInsufficient && tipAmount && styles.insufficientInput,
                      isValidAmount && styles.validInput
                    ]}
                    value={tipAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleTip}
                    autoFocus={true}
                    selectionColor="#43e97b"
                    maxLength={10}
                  />
                </LinearGradient>
              </BlurView>
            </View>

            {/* Warning Message */}
            {isInsufficient && tipAmount && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  ⚠️ Insufficient funds. You can tip up to {walletBalance.toFixed(2)} $ALLY
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']}
                    style={styles.actionGradient}
                  >
                    <Text style={styles.actionText}>Cancel</Text>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tipButton,
                  !isValidAmount && styles.disabledButton
                ]}
                onPress={handleTip}
                activeOpacity={0.8}
                disabled={!isValidAmount}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={
                      isValidAmount
                        ? ['rgba(67, 233, 123, 0.8)', 'rgba(56, 249, 215, 0.8)']
                        : ['rgba(25, 25, 25, 0.9)', 'rgba(20, 20, 20, 0.95)']
                    }
                    style={styles.actionGradient}
                  >
                    <Text style={[
                      styles.actionText,
                      isValidAmount && styles.enabledActionText
                    ]}>
                      Send Tip
                    </Text>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.4)',
  },
  modalGradient: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.extraBold,
    color: '#43e97b',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: '#43e97b',
    textAlign: 'center',
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  currencySymbol: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#43e97b',
    marginRight: 12,
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
    textAlign: 'center',
  },
  insufficientInput: {
    color: '#ff4444',
  },
  validInput: {
    color: '#43e97b',
  },
  warningContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  warningText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: '#ff6b6b',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tipButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
  },
  enabledActionText: {
    color: '#000000',
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
});