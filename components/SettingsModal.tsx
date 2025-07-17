import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useTheme } from '../context/ThemeContext';
import { themeOptions } from '../constants/Themes';
import { Ionicons } from '@expo/vector-icons';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
}: SettingsModalProps) {
  const { theme, colorScheme, isDark, setColorScheme, toggleDarkMode, colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleToggle = (setter: (value: boolean) => void, currentValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(!currentValue);
  };

  const SettingRow = ({ 
    title, 
    description, 
    value, 
    onValueChange 
  }: { 
    title: string; 
    description?: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: colors.primary }}
        thumbColor={value ? '#ffffff' : '#666666'}
        ios_backgroundColor="rgba(255, 255, 255, 0.1)"
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={styles.modalContent}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.contentContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Settings</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Settings Content */}
              <ScrollView 
                style={styles.settingsContent} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Notifications Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notifications</Text>
                  <View style={styles.sectionContentWrapper}>
                    <BlurView intensity={25} style={styles.sectionBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.sectionContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <SettingRow
                          title="Push Notifications"
                          description="Get notified about tips and replies"
                          value={notifications}
                          onValueChange={(value) => handleToggle(setNotifications, notifications)}
                        />
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Appearance</Text>
                  <View style={styles.sectionContentWrapper}>
                    <BlurView intensity={25} style={styles.sectionBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.sectionContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                    {/* Theme Selector */}
                    <TouchableOpacity
                      style={styles.themeSelector}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowThemeDropdown(!showThemeDropdown);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>Color Theme</Text>
                        <Text style={styles.settingDescription}>Choose your app theme</Text>
                      </View>
                      <View style={styles.themeSelectorRight}>
                        <LinearGradient
                          colors={theme.gradients.primary}
                          style={styles.themePreview}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                        <Text style={styles.dropdownArrow}>{showThemeDropdown ? '▲' : '▼'}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Theme Dropdown */}
                    {showThemeDropdown && (
                      <View style={styles.themeDropdownWrapper}>
                        <BlurView intensity={25} style={styles.themeDropdownBlur}>
                          <LinearGradient
                            colors={gradients.surface}
                            style={styles.themeDropdown}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            {themeOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                style={[
                                  styles.themeOption,
                                  colorScheme === option.value && styles.themeOptionActive
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setColorScheme(option.value as any);
                                  setShowThemeDropdown(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.themeOptionText,
                                  colorScheme === option.value && styles.themeOptionTextActive
                                ]}>
                                  {option.label}
                                </Text>
                                {colorScheme === option.value && (
                                  <Text style={styles.checkmark}>✓</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </LinearGradient>
                        </BlurView>
                      </View>
                    )}
                    
                    <SettingRow
                      title="Dark Mode"
                      description="Use dark theme"
                      value={isDark}
                      onValueChange={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleDarkMode();
                      }}
                    />
                    <SettingRow
                      title="Compact View"
                      description="Show more posts on screen"
                      value={compactView}
                      onValueChange={(value) => handleToggle(setCompactView, compactView)}
                    />
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>

                {/* Behavior Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Behavior</Text>
                  <View style={styles.sectionContentWrapper}>
                    <BlurView intensity={25} style={styles.sectionBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.sectionContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                    <SettingRow
                      title="Sound Effects"
                      description="Play sounds for actions"
                      value={soundEffects}
                      onValueChange={(value) => handleToggle(setSoundEffects, soundEffects)}
                    />
                    <SettingRow
                      title="Haptic Feedback"
                      description="Vibrate on touch"
                      value={hapticFeedback}
                      onValueChange={(value) => handleToggle(setHapticFeedback, hapticFeedback)}
                    />
                    <SettingRow
                      title="Auto-play Videos"
                      description="Automatically play video content"
                      value={autoPlayVideos}
                      onValueChange={(value) => handleToggle(setAutoPlayVideos, autoPlayVideos)}
                    />
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <View style={styles.sectionContentWrapper}>
                    <BlurView intensity={25} style={styles.sectionBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.sectionContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                    <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
                      <Text style={styles.aboutLabel}>Version</Text>
                      <Text style={styles.aboutValue}>1.0.0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
                      <Text style={styles.aboutLabel}>Terms of Service</Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
                      <Text style={styles.aboutLabel}>Privacy Policy</Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account</Text>
                  <View style={styles.sectionContentWrapper}>
                    <BlurView intensity={25} style={styles.sectionBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.sectionContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                    <TouchableOpacity 
                      style={styles.dangerButton} 
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        // Handle sign out
                      }}
                    >
                      <Text style={styles.dangerButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalBackground,
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
  modalContent: {
    width: '95%',
    maxWidth: 500,
    height: '85%',
    maxHeight: 700,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary + '99',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    overflow: 'hidden',
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    flex: 1,
  },
  contentContainer: {
    borderRadius: 24,
    padding: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.textSecondary,
  },
  settingsContent: {
    flex: 1,
    marginTop: 10,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: colors.primary,
    marginBottom: 12,
  },
  sectionContentWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.text,
  },
  aboutValue: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
  },
  aboutArrow: {
    fontSize: FontSizes.xl,
    color: colors.textSecondary,
  },
  dangerButton: {
    margin: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.error + '1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '4D',
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: colors.error,
  },
  themeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  themeSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themePreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dropdownArrow: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
  },
  themeDropdownWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  themeDropdownBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  themeDropdown: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  themeOptionActive: {
    backgroundColor: colors.primary + '1A',
  },
  themeOptionText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    color: colors.text,
  },
  themeOptionTextActive: {
    color: colors.primary,
    fontFamily: Fonts.semiBold,
  },
  checkmark: {
    fontSize: FontSizes.lg,
    color: colors.primary,
    fontFamily: Fonts.bold,
  },
});