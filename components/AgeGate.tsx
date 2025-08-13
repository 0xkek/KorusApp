import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';

const AGE_GATE_KEY = 'korus_age_verified';
const TERMS_ACCEPTED_KEY = 'korus_terms_accepted';

interface AgeGateProps {
  onComplete: () => void;
}

export default function AgeGate({ onComplete }: AgeGateProps) {
  const { colors, gradients, isDarkMode } = useTheme();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Hardcoded fresh mint theme colors
  const mintGreen = '#43e97b';
  const mintGradient = ['#43e97b', '#38f9d7'];

  const handleContinue = async () => {
    if (!ageConfirmed) {
      setErrorMessage('Please confirm you are 18 or older');
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Please accept the terms and conditions');
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Save verification
    await SecureStore.setItemAsync(AGE_GATE_KEY, 'verified');
    await SecureStore.setItemAsync(TERMS_ACCEPTED_KEY, 'accepted');
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Success);
    onComplete();
  };


  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]}>
        <View style={[styles.content, { backgroundColor: '#0f0f0f', borderColor: mintGreen, borderWidth: 1 }]}>
          <LinearGradient
            colors={mintGradient}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shield-checkmark" size={40} color="#000" />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>
            Age Verification Required
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Korus includes games with real token wagering. To comply with regulations, we need to verify your age and accept our terms.
          </Text>

          {/* Age Confirmation */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAgeConfirmed(!ageConfirmed);
              setShowError(false);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: ageConfirmed ? mintGreen : 'transparent',
                  borderColor: ageConfirmed ? mintGreen : '#333',
                },
              ]}
            >
              {ageConfirmed && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </View>
            <Text style={[styles.checkboxText, { color: colors.text }]}>
              I confirm that I am 18 years of age or older
            </Text>
          </TouchableOpacity>

          {showError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Terms Acceptance */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTermsAccepted(!termsAccepted);
              setShowError(false);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: termsAccepted ? mintGreen : 'transparent',
                  borderColor: termsAccepted ? mintGreen : '#333',
                },
              ]}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </View>
            <Text style={[styles.checkboxText, { color: colors.text }]}>
              I accept the{' '}
              <Text style={{ color: mintGreen }}>Terms of Service</Text> and{' '}
              <Text style={{ color: mintGreen }}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <View style={[styles.disclaimerContainer, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
            <Text style={[styles.disclaimerTitle, { color: '#FFC107' }]}>
              ⚠️ Financial Risk Warning
            </Text>
            <Text style={[styles.disclaimerText, { color: '#FFE082' }]}>
              • Games involve real cryptocurrency wagering
              {'\n'}• You can lose your entire wager amount
              {'\n'}• Only wager what you can afford to lose
              {'\n'}• Gambling can be addictive - play responsibly
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                opacity: ageConfirmed && termsAccepted ? 1 : 0.6,
              },
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!ageConfirmed || !termsAccepted}
          >
            <LinearGradient
              colors={mintGradient}
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.continueText, { color: '#000' }]}>
                Continue to Korus
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Check if age verification is needed
export async function needsAgeVerification(): Promise<boolean> {
  try {
    const verified = await SecureStore.getItemAsync(AGE_GATE_KEY);
    const termsAccepted = await SecureStore.getItemAsync(TERMS_ACCEPTED_KEY);
    return !verified || !termsAccepted;
  } catch {
    return true;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxText: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  errorContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  disclaimerContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  continueButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
  },
});