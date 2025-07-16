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
  const { colors, isDarkMode, gradients } = useTheme();
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
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <BlurView intensity={60} style={[styles.modalContainer, { borderColor: `${colors.primary}66` }]}>
          <LinearGradient
            colors={gradients.surface}
            style={styles.modalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primary, textShadowColor: `${colors.primary}66` }]}>💰 Tip {username}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter amount in $ALLY tokens</Text>
              <Text style={[styles.balanceText, { color: colors.primary, textShadowColor: `${colors.primary}66` }]}>
                Balance: {walletBalance.toFixed(2)} $ALLY
              </Text>
            </View>

            {/* Tip Amount Input */}
            <View style={styles.inputContainer}>
              <BlurView intensity={25} style={styles.inputBlur}>
                <LinearGradient
                  colors={gradients.surface}
                  style={[styles.inputGradient, { borderColor: colors.borderLight }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.currencySymbol, { color: colors.primary, textShadowColor: `${colors.primary}66` }]}>$ALLY</Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      { color: colors.text },
                      isInsufficient && tipAmount && styles.insufficientInput,
                      isValidAmount && { color: colors.primary }
                    ]}
                    value={tipAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleTip}
                    autoFocus={true}
                    selectionColor={colors.primary}
                    maxLength={10}
                  />
                </LinearGradient>
              </BlurView>
            </View>

            {/* Warning Message */}
            {isInsufficient && tipAmount && (
              <View style={[styles.warningContainer, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}4D` }]}>
                <Text style={[styles.warningText, { color: colors.error }]}>
                  ⚠️ Insufficient funds. You can tip up to {walletBalance.toFixed(2)} $ALLY
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { shadowColor: colors.shadowColor }]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={gradients.surface}
                    style={[styles.actionGradient, { borderColor: colors.borderLight }]}
                  >
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tipButton,
                  !isValidAmount && styles.disabledButton,
                  { shadowColor: colors.shadowColor }
                ]}
                onPress={handleTip}
                activeOpacity={0.8}
                disabled={!isValidAmount}
              >
                <BlurView intensity={25} style={styles.actionBlur}>
                  <LinearGradient
                    colors={
                      isValidAmount
                        ? gradients.primary
                        : gradients.surface
                    }
                    style={[styles.actionGradient, { borderColor: colors.borderLight }]}
                  >
                    <Text style={[
                      styles.actionText,
                      { color: isValidAmount ? (isDarkMode ? '#000000' : '#000000') : colors.textSecondary },
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
    textAlign: 'center',
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
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
  },
  currencySymbol: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    marginRight: 12,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSizes['3xl'],
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  insufficientInput: {
    color: '#ff4444', // Will be overridden by inline style
  },
  validInput: {
    // Color handled by inline style
  },
  warningContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tipButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
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
  },
  actionText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.3,
  },
  enabledActionText: {
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
});