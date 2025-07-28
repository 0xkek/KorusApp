import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AvatarSelectionModal from '../components/AvatarSelectionModal';
import NFTAvatarModal from '../components/NFTAvatarModal';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode, gradients } = useTheme();
  const { 
    walletAddress, 
    selectedAvatar, 
    setSelectedAvatar, 
    selectedNFTAvatar, 
    setSelectedNFTAvatar,
    snsDomain,
    timeFunUsername,
    setTimeFunUsername,
    isPremium
  } = useWallet();
  
  const styles = React.useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);
  
  // State for editable fields
  const [displayName, setDisplayName] = useState(snsDomain || timeFunUsername || '');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const [showNFTSelection, setShowNFTSelection] = useState(false);
  const [selectedThemeColor, setSelectedThemeColor] = useState(colors.primary);
  
  // Theme color options
  const themeColors = [
    '#43e97b', // Default green
    '#38f9d7', // Cyan
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Sage
    '#DDA0DD', // Plum
    '#FFD93D', // Yellow
    '#6C5CE7', // Purple
    '#FD79A8', // Pink
  ];
  
  // Track changes
  useEffect(() => {
    const hasAnyChanges = 
      displayName !== (snsDomain || timeFunUsername || '') ||
      bio !== '' ||
      location !== '' ||
      website !== '' ||
      twitter !== '' ||
      selectedThemeColor !== colors.primary;
    
    setHasChanges(hasAnyChanges);
  }, [displayName, bio, location, website, twitter, selectedThemeColor, snsDomain, timeFunUsername, colors.primary]);
  
  const handleSave = async () => {
    if (!hasChanges) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Validate inputs
    if (website && !website.startsWith('http')) {
      Alert.alert('Invalid Website', 'Website URL must start with http:// or https://');
      return;
    }
    
    // TODO: Save to backend
    // For now, just save what we can locally
    if (displayName !== timeFunUsername) {
      setTimeFunUsername(displayName);
    }
    
    Alert.alert('Success', 'Profile updated successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };
  
  const handleChangeAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Show NFT selection first, fallback to emoji
    setShowNFTSelection(true);
  };
  
  const pickBannerImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      // TODO: Upload banner image
      Alert.alert('Coming Soon', 'Banner image upload will be available soon!');
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Background */}
        <LinearGradient
          colors={gradients.surface}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
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
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <BlurView intensity={25} style={styles.backButtonBlur}>
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
            </BlurView>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Edit Profile</Text>
          
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges}
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Banner Section */}
            <TouchableOpacity 
              style={styles.bannerSection}
              onPress={pickBannerImage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[selectedThemeColor, selectedThemeColor + 'CC']}
                style={styles.bannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.bannerOverlay}>
                  <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.bannerText}>Add Banner Image</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity 
                onPress={handleChangeAvatar}
                activeOpacity={0.8}
                style={styles.avatarContainer}
              >
                <LinearGradient
                  colors={[selectedThemeColor, selectedThemeColor + 'CC']}
                  style={styles.avatarGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {selectedNFTAvatar ? (
                    <Image 
                      source={{ uri: selectedNFTAvatar.image || selectedNFTAvatar.uri }}
                      style={styles.avatarImage}
                    />
                  ) : selectedAvatar ? (
                    <Text style={styles.avatarEmoji}>{selectedAvatar}</Text>
                  ) : (
                    <Text style={styles.avatarText}>
                      {walletAddress ? walletAddress.slice(0, 2).toUpperCase() : '??'}
                    </Text>
                  )}
                </LinearGradient>
                <View style={styles.editIconContainer}>
                  <LinearGradient
                    colors={gradients.primary}
                    style={styles.editIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="camera" size={16} color={isDarkMode ? '#000' : '#fff'} />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Form Fields */}
            <View style={styles.formSection}>
              {/* Display Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter display name"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={30}
                />
                <Text style={styles.charCount}>{displayName.length}/30</Text>
              </View>
              
              {/* Bio */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={160}
                />
                <Text style={styles.charCount}>{bio.length}/160</Text>
              </View>
              
              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="City, Country"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={30}
                  />
                </View>
              </View>
              
              {/* Website */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
              
              {/* Twitter */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>X (Twitter)</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="logo-twitter" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    value={twitter}
                    onChangeText={setTwitter}
                    placeholder="@username"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              {/* Theme Color */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Theme Color</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.colorPicker}
                >
                  {themeColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        selectedThemeColor === color && styles.colorOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedThemeColor(color);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <LinearGradient
                        colors={[color, color + 'CC']}
                        style={styles.colorOptionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {selectedThemeColor === color && (
                          <Ionicons name="checkmark" size={20} color="#fff" />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {!isPremium && (
                <View style={styles.premiumBanner}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.premiumGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="star" size={20} color="#000" />
                    <View style={styles.premiumTextContainer}>
                      <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                      <Text style={styles.premiumSubtitle}>
                        Unlock custom themes, SNS domains, and more
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      
      {/* Avatar Selection Modals */}
      <NFTAvatarModal
        visible={showNFTSelection}
        onClose={() => {
          setShowNFTSelection(false);
          // Don't automatically open emoji picker
        }}
        onSelectNFT={(nft) => {
          setSelectedNFTAvatar({
            id: nft.mint,
            name: nft.name,
            image: nft.image,
            uri: nft.uri,
            collection: nft.collection?.name
          });
          setSelectedAvatar(null);
          setShowNFTSelection(false);
        }}
        onSelectEmoji={() => {
          setShowNFTSelection(false);
          setShowAvatarSelection(true);
        }}
      />
      
      <AvatarSelectionModal
        visible={showAvatarSelection}
        onClose={() => setShowAvatarSelection(false)}
        onSelectAvatar={(avatar) => {
          setSelectedAvatar(avatar);
          setSelectedNFTAvatar(null);
          setShowAvatarSelection(false);
        }}
        currentAvatar={selectedAvatar}
      />
    </>
  );
}

const createStyles = (colors: any, isDarkMode: boolean, insets: any) => StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: insets.top + 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: isDarkMode ? '#000' : '#fff',
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  bannerSection: {
    height: 150,
    marginBottom: -40,
  },
  bannerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.8)',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarText: {
    fontSize: FontSizes['2xl'],
    fontFamily: Fonts.bold,
    color: isDarkMode ? '#000' : '#fff',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.background,
  },
  editIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface + '60',
    borderRadius: 12,
    padding: 16,
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface + '60',
    borderRadius: 12,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputWithIconText: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  colorPicker: {
    marginTop: 8,
  },
  colorOption: {
    marginRight: 12,
    borderRadius: 20,
    padding: 3,
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  colorOptionGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBanner: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    color: '#000',
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#000',
    opacity: 0.8,
  },
});