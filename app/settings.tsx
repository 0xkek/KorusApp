import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

const HIDE_SPONSORED_KEY = 'korus_hide_sponsored_posts';
const HIDE_GAME_POSTS_KEY = 'korus_hide_game_posts';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDarkMode, gradients, colorScheme, setColorScheme, isColorSchemeLocked, toggleDarkMode } = useTheme();
  const { isPremium, setPremiumStatus, logout } = useWallet();
  const [hideSponsoredPosts, setHideSponsoredPosts] = useState(false);
  const [hideGamePosts, setHideGamePosts] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Load saved preferences
  React.useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedHideSponsored = await SecureStore.getItemAsync(HIDE_SPONSORED_KEY);
      if (savedHideSponsored === 'true') {
        setHideSponsoredPosts(true);
      }
      
      const savedHideGamePosts = await SecureStore.getItemAsync(HIDE_GAME_POSTS_KEY);
      if (savedHideGamePosts === 'true') {
        setHideGamePosts(true);
      }
    } catch (error) {
      logger.error('Error loading preferences:', error);
    }
  };

  const handleToggleSponsored = async (value: boolean) => {
    if (!isPremium) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPremiumModal(true);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHideSponsoredPosts(value);
    await SecureStore.setItemAsync(HIDE_SPONSORED_KEY, value.toString());
  };
  
  const handleToggleGamePosts = async (value: boolean) => {
    // Available to all users
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHideGamePosts(value);
    await SecureStore.setItemAsync(HIDE_GAME_POSTS_KEY, value.toString());
  };

  const handleThemeSelect = (theme: 'mint' | 'purple' | 'blue' | 'gold' | 'cherry' | 'cyber') => {
    if (isColorSchemeLocked(theme) && !isPremium) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPremiumModal(true);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setColorScheme(theme, isPremium);
  };

  const themes = [
    { id: 'mint', name: 'Mint Fresh', colors: ['#43e97b', '#38f9d7'], free: true },
    { id: 'purple', name: 'Royal Purple', colors: ['#BB73E0', '#A055D6'], free: false },
    { id: 'blue', name: 'Ocean Blue', colors: ['#4A90E2', '#7B68EE'], free: false },
    { id: 'gold', name: 'Premium Gold', colors: ['#FFD700', '#FFA500'], free: false },
    { id: 'cherry', name: 'Cherry Blossom', colors: ['#FF6B9D', '#FF8E9E'], free: false },
    { id: 'cyber', name: 'Cyber Neon', colors: ['#00FFF0', '#FF10F0'], free: false },
  ];

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Background gradients */}
        <LinearGradient
          colors={gradients.surface}
          style={styles.baseBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: 50 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.primary}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name="arrow-back" 
                size={20} 
                color={isDarkMode ? '#000' : '#fff'} 
              />
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Status */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LinearGradient
                  colors={isPremium ? ['#FFD700', '#FFA500'] : gradients.primary}
                  style={styles.premiumBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons 
                    name={isPremium ? "star" : "star-outline"} 
                    size={20} 
                    color={isDarkMode ? '#000' : '#fff'} 
                  />
                  <Text style={[styles.premiumBadgeText, { color: isDarkMode ? '#000' : '#fff' }]}>
                    {isPremium ? 'PREMIUM MEMBER' : 'FREE ACCOUNT'}
                  </Text>
                </LinearGradient>
                
                {!isPremium && (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={() => setShowPremiumModal(true)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.upgradeButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </BlurView>
          </View>


          {/* Appearance Settings */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
            
            {/* Dark Mode Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Available for all users
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleDarkMode();
                }}
                trackColor={{ false: colors.borderLight, true: colors.primary }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Color Theme</Text>
            
            {/* Dropdown Button */}
            <TouchableOpacity
              style={[styles.dropdownButton, { borderColor: colors.border }]}
              onPress={() => setShowThemeDropdown(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownButtonContent}>
                <LinearGradient
                  colors={themes.find(t => t.id === colorScheme)?.colors || ['#43e97b', '#38f9d7']}
                  style={styles.dropdownPreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={[styles.dropdownButtonText, { color: colors.text }]}>
                  {themes.find(t => t.id === colorScheme)?.name || 'Select Theme'}
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </View>
            </TouchableOpacity>
            
            {/* Theme Dropdown Modal */}
            <Modal
              visible={showThemeDropdown}
              transparent
              animationType="slide"
              onRequestClose={() => setShowThemeDropdown(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowThemeDropdown(false)}>
                <View style={styles.dropdownOverlay}>
                  <View style={[styles.dropdownMenuWrapper, { 
                    shadowColor: colors.primary,
                    borderColor: colors.primary + '4D'
                  }]}>
                    <BlurView intensity={30} style={styles.dropdownBlur}>
                      <LinearGradient
                        colors={gradients.surface}
                        style={styles.dropdownGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <ScrollView 
                          showsVerticalScrollIndicator={false}
                          bounces={false}
                        >
                          {themes.map((theme, index) => (
                            <TouchableOpacity
                              key={theme.id}
                              style={[
                                styles.dropdownItem,
                                colorScheme === theme.id && [
                                  styles.dropdownItemSelected,
                                  { backgroundColor: colors.primary + '15' }
                                ],
                                index === themes.length - 1 && { borderBottomWidth: 0 }
                              ]}
                              onPress={() => {
                                handleThemeSelect(theme.id as any);
                                setShowThemeDropdown(false);
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.dropdownItemPreviewWrapper, {
                                shadowColor: theme.colors[0],
                                borderColor: colorScheme === theme.id ? theme.colors[0] : 'transparent'
                              }]}>
                                <LinearGradient
                                  colors={theme.colors}
                                  style={styles.dropdownItemPreview}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                />
                              </View>
                              <Text style={[
                                styles.dropdownItemText, 
                                { color: colors.text },
                                colorScheme === theme.id && { 
                                  color: colors.primary,
                                  fontFamily: Fonts.bold
                                }
                              ]}>
                                {theme.name}
                              </Text>
                              {!theme.free && !isPremium && (
                                <LinearGradient
                                  colors={['#FFD700', '#FFA500']}
                                  style={styles.dropdownLockBadge}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                >
                                  <Ionicons name="lock-closed" size={12} color="#000" />
                                  <Text style={styles.dropdownLockText}>PREMIUM</Text>
                                </LinearGradient>
                              )}
                              {colorScheme === theme.id && (
                                <View style={[styles.checkmarkWrapper, { backgroundColor: colors.primary }]}>
                                  <Ionicons 
                                    name="checkmark" 
                                    size={16} 
                                    color={isDarkMode ? '#000' : '#fff'} 
                                  />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Premium Features */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Premium Features</Text>
            
            {/* Hide Sponsored Posts */}
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Hide Sponsored Posts</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Remove sponsored content from your feed
                </Text>
              </View>
              <View style={styles.switchContainer}>
                {!isPremium && (
                  <View style={[styles.premiumOnlyBadge, { backgroundColor: '#FFD700' }]}>
                    <Ionicons name="star" size={10} color="#000" />
                    <Text style={styles.premiumOnlyText}>PREMIUM</Text>
                  </View>
                )}
                <Switch
                  value={hideSponsoredPosts && isPremium}
                  onValueChange={handleToggleSponsored}
                  trackColor={{ false: colors.borderLight, true: colors.primary }}
                  thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                  disabled={!isPremium}
                />
              </View>
            </View>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Content Preferences */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Content Preferences</Text>
                
                {/* Hide Game Posts */}
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Hide Game Posts</Text>
                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Remove mini game posts from your feed
                    </Text>
                  </View>
                  <View style={styles.switchContainer}>
                    <Switch
                      value={hideGamePosts}
                      onValueChange={handleToggleGamePosts}
                      trackColor={{ false: colors.borderLight, true: colors.primary }}
                      thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                </View>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Debug - Premium Toggle (remove in production) */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Debug Options</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Toggle Premium Status</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  For testing premium features
                </Text>
              </View>
              <Switch
                value={isPremium}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setPremiumStatus(value);
                }}
                trackColor={{ false: colors.borderLight, true: colors.primary }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              />
            </View>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Account */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
                
                {/* Logout */}
                <TouchableOpacity
                  style={[styles.supportRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowLogoutConfirm(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.supportInfo}>
                    <Ionicons name="log-out-outline" size={24} color={colors.error || '#FF4444'} />
                    <Text style={[styles.supportLabel, { color: colors.error || '#FF4444' }]}>Logout</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Support & Information */}
          <View style={[styles.sectionWrapper, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }]}>
            <BlurView intensity={25} style={styles.sectionBlur}>
              <LinearGradient
                colors={gradients.surface}
                style={[styles.sectionGradient, { borderColor: colors.primary + '4D' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Support & Information</Text>
                
                {/* FAQ */}
                <TouchableOpacity
                  style={[styles.supportRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowFAQModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.supportInfo}>
                    <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                    <Text style={[styles.supportLabel, { color: colors.text }]}>FAQ</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Community Rules */}
                <TouchableOpacity
                  style={[styles.supportRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowRulesModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.supportInfo}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
                    <Text style={[styles.supportLabel, { color: colors.text }]}>Community Rules</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Moderation Dashboard */}
                {isPremium && (
                  <TouchableOpacity
                    style={[styles.supportRow, { borderBottomColor: colors.borderLight }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/moderation');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.supportInfo}>
                      <Ionicons name="construct-outline" size={24} color={colors.primary} />
                      <Text style={[styles.supportLabel, { color: colors.text }]}>Moderation</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}

                {/* Ads Service Contact */}
                <TouchableOpacity
                  style={[styles.supportRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAdsModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.supportInfo}>
                    <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
                    <Text style={[styles.supportLabel, { color: colors.text }]}>Advertise with Korus</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </View>
        </ScrollView>

        {/* Premium Modal */}
        {showPremiumModal && (
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPremiumModal(false)}
          >
            <View style={styles.modalContent}>
              <BlurView intensity={60} style={styles.modalBlur}>
                <LinearGradient
                  colors={gradients.surface}
                  style={styles.modalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.modalHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="star" size={48} color="#fff" />
                    <Text style={styles.modalTitle}>Unlock Premium</Text>
                  </LinearGradient>
                  
                  <View style={styles.modalBody}>
                <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                  Get exclusive features with Korus Premium
                </Text>
                
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Hide sponsored posts
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Use SNS domain as display name
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Exclusive color themes
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Gold verified badge
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={() => {
                    // In production, this would handle payment
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setPremiumStatus(true);
                    setShowPremiumModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.subscribeButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe for $4.99/month</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPremiumModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>
                </LinearGradient>
              </BlurView>
            </View>
          </TouchableOpacity>
        )}

        {/* FAQ Modal */}
        <Modal
          visible={showFAQModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFAQModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowFAQModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.infoModalContent, { maxHeight: '80%' }]}>
                  <BlurView intensity={60} style={styles.modalBlur}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.modalGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.infoModalHeader}>
                        <Text style={[styles.infoModalTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
                        <TouchableOpacity
                          onPress={() => setShowFAQModal(false)}
                          style={styles.closeButton}
                        >
                          <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      
                      <ScrollView 
                        style={styles.infoModalBody}
                        showsVerticalScrollIndicator={false}
                      >
                        <View style={styles.faqItem}>
                          <Text style={[styles.faqQuestion, { color: colors.primary }]}>What is Korus?</Text>
                          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>Korus is a Web3 social platform where authentic conversations meet blockchain innovation. Share thoughts, earn rewards, and connect with a community that values real engagement.</Text>
                        </View>
                        
                        <View style={styles.faqItem}>
                          <Text style={[styles.faqQuestion, { color: colors.primary }]}>How do I earn $ALLY tokens?</Text>
                          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>You earn $ALLY tokens by receiving tips from other users who appreciate your content. Create valuable posts and engage meaningfully with the community.</Text>
                        </View>
                        
                        <View style={styles.faqItem}>
                          <Text style={[styles.faqQuestion, { color: colors.primary }]}>What are bumps?</Text>
                          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>Bumps temporarily boost a post&apos;s visibility for 5 minutes, helping important content reach more people. Use bumps to highlight time-sensitive or valuable posts.</Text>
                        </View>
                        
                        <View style={styles.faqItem}>
                          <Text style={[styles.faqQuestion, { color: colors.primary }]}>What&apos;s included in Premium?</Text>
                          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>Premium members get exclusive color themes, gold verified badge, ability to use SNS domains as display names, and can hide sponsored posts for a cleaner feed.</Text>
                        </View>
                      </ScrollView>
                    </LinearGradient>
                  </BlurView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Community Rules Modal */}
        <Modal
          visible={showRulesModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRulesModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowRulesModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.infoModalContent, { maxHeight: '80%' }]}>
                  <BlurView intensity={60} style={styles.modalBlur}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.modalGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.infoModalHeader}>
                        <Text style={[styles.infoModalTitle, { color: colors.text }]}>Community Rules</Text>
                        <TouchableOpacity
                          onPress={() => setShowRulesModal(false)}
                          style={styles.closeButton}
                        >
                          <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      
                      <ScrollView 
                        style={styles.infoModalBody}
                        showsVerticalScrollIndicator={false}
                      >
                        <View style={styles.ruleItem}>
                          <View style={[styles.ruleNumber, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.ruleNumberText, { color: isDarkMode ? '#000' : '#fff' }]}>1</Text>
                          </View>
                          <View style={styles.ruleContent}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>Be Authentic</Text>
                            <Text style={[styles.ruleDescription, { color: colors.textSecondary }]}>Share genuine thoughts and experiences. No fake accounts or impersonation.</Text>
                          </View>
                        </View>
                        
                        <View style={styles.ruleItem}>
                          <View style={[styles.ruleNumber, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.ruleNumberText, { color: isDarkMode ? '#000' : '#fff' }]}>2</Text>
                          </View>
                          <View style={styles.ruleContent}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>Respect Everyone</Text>
                            <Text style={[styles.ruleDescription, { color: colors.textSecondary }]}>Treat all community members with kindness. No harassment, hate speech, or discrimination.</Text>
                          </View>
                        </View>
                        
                        <View style={styles.ruleItem}>
                          <View style={[styles.ruleNumber, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.ruleNumberText, { color: isDarkMode ? '#000' : '#fff' }]}>3</Text>
                          </View>
                          <View style={styles.ruleContent}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>Quality Over Quantity</Text>
                            <Text style={[styles.ruleDescription, { color: colors.textSecondary }]}>Focus on meaningful contributions. Avoid spam, repetitive content, or low-effort posts.</Text>
                          </View>
                        </View>
                        
                        <View style={styles.ruleItem}>
                          <View style={[styles.ruleNumber, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.ruleNumberText, { color: isDarkMode ? '#000' : '#fff' }]}>4</Text>
                          </View>
                          <View style={styles.ruleContent}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>Protect Privacy</Text>
                            <Text style={[styles.ruleDescription, { color: colors.textSecondary }]}>Never share personal information of others. Respect everyone&apos;s privacy and security.</Text>
                          </View>
                        </View>
                        
                        <View style={styles.ruleItem}>
                          <View style={[styles.ruleNumber, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.ruleNumberText, { color: isDarkMode ? '#000' : '#fff' }]}>5</Text>
                          </View>
                          <View style={styles.ruleContent}>
                            <Text style={[styles.ruleTitle, { color: colors.text }]}>Stay On Topic</Text>
                            <Text style={[styles.ruleDescription, { color: colors.textSecondary }]}>Post content in relevant categories. Keep discussions focused and constructive.</Text>
                          </View>
                        </View>
                        
                        <Text style={[styles.rulesFooter, { color: colors.textTertiary }]}>Violation of these rules may result in content removal or account suspension.</Text>
                      </ScrollView>
                    </LinearGradient>
                  </BlurView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Ads Service Modal */}
        <Modal
          visible={showAdsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAdsModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowAdsModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.infoModalContent}>
                  <BlurView intensity={60} style={styles.modalBlur}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.modalGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.infoModalHeader}>
                        <Text style={[styles.infoModalTitle, { color: colors.text }]}>Advertise with Korus</Text>
                        <TouchableOpacity
                          onPress={() => setShowAdsModal(false)}
                          style={styles.closeButton}
                        >
                          <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      
                      <ScrollView 
                        style={styles.infoModalBody}
                        showsVerticalScrollIndicator={false}
                      >
                        <LinearGradient
                          colors={gradients.primary}
                          style={styles.adsHero}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="megaphone" size={48} color={isDarkMode ? '#000' : '#fff'} />
                          <Text style={[styles.adsHeroText, { color: isDarkMode ? '#000' : '#fff' }]}>Reach Your Audience</Text>
                        </LinearGradient>
                        
                        <Text style={[styles.adsDescription, { color: colors.text }]}>Connect with engaged Web3 users through sponsored posts on Korus.</Text>
                        
                        <View style={styles.adsFeatures}>
                          <View style={styles.adsFeature}>
                            <Ionicons name="people" size={24} color={colors.primary} />
                            <Text style={[styles.adsFeatureText, { color: colors.textSecondary }]}>Targeted reach to crypto-native audience</Text>
                          </View>
                          <View style={styles.adsFeature}>
                            <Ionicons name="trending-up" size={24} color={colors.primary} />
                            <Text style={[styles.adsFeatureText, { color: colors.textSecondary }]}>Performance analytics and insights</Text>
                          </View>
                          <View style={styles.adsFeature}>
                            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                            <Text style={[styles.adsFeatureText, { color: colors.textSecondary }]}>Brand-safe environment</Text>
                          </View>
                        </View>
                        
                        <View style={[styles.contactSection, { backgroundColor: colors.surface + '50', borderColor: colors.borderLight }]}>
                          <Text style={[styles.contactTitle, { color: colors.text }]}>Get Started</Text>
                          <Text style={[styles.contactEmail, { color: colors.primary }]}>ads@korus.social</Text>
                          <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>Contact our advertising team to discuss your campaign goals and pricing.</Text>
                        </View>
                      </ScrollView>
                    </LinearGradient>
                  </BlurView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={showLogoutConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutConfirm(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowLogoutConfirm(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <BlurView intensity={60} style={styles.modalBlur}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.modalGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.modalBody}>
                        <Ionicons name="log-out-outline" size={48} color={colors.error || '#FF4444'} style={{ alignSelf: 'center', marginBottom: 16 }} />
                        
                        <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', fontSize: FontSizes.xl }]}>
                          Logout from Korus?
                        </Text>
                        
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary, marginBottom: 32 }]}>
                          This will clear your wallet data and you&apos;ll need to create a new wallet to use the app again.
                        </Text>
                        
                        <TouchableOpacity
                          style={[styles.subscribeButton, { marginBottom: 12 }]}
                          onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowLogoutConfirm(false);
                            await logout();
                            router.replace('/');
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.subscribeButtonGradient, { backgroundColor: colors.error || '#FF4444' }]}>
                            <Text style={[styles.subscribeButtonText, { color: '#fff' }]}>Logout</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setShowLogoutConfirm(false)}
                        >
                          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </BlurView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionGradient: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  premiumBadgeText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  upgradeButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  upgradeButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  dropdownButton: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  dropdownMenuWrapper: {
    borderRadius: 24,
    maxHeight: 420,
    width: '100%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  dropdownBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  dropdownGradient: {
    borderRadius: 24,
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 16,
  },
  dropdownItemSelected: {
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  dropdownItemPreviewWrapper: {
    borderRadius: 24,
    padding: 2,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownItemPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dropdownItemText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    flex: 1,
    letterSpacing: -0.3,
  },
  dropdownLockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownLockText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 0.5,
  },
  checkmarkWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(67, 233, 123, 0.15)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  premiumOnlyText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    borderRadius: 24,
  },
  modalHeader: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginTop: 12,
  },
  modalBody: {
    padding: 24,
  },
  modalSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 24,
  },
  featureList: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  subscribeButton: {
    borderRadius: 12,
    marginBottom: 12,
  },
  subscribeButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  supportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  infoModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  infoModalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  infoModalBody: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  faqItem: {
    marginBottom: 24,
  },
  faqQuestion: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  ruleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleNumberText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  rulesFooter: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  adsHero: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 20,
  },
  adsHeroText: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    marginTop: 12,
  },
  adsDescription: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 24,
  },
  adsFeatures: {
    marginBottom: 24,
  },
  adsFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  adsFeatureText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  contactSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  contactTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  contactDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
});