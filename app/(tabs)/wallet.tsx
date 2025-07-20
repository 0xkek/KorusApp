import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, Clipboard, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import SwapModal from '../../components/SwapModal';
import { scale, verticalScale, moderateScale, responsiveDimensions, isSmallDevice, scaleFontSize } from '../../utils/responsive';

interface Token {
  symbol: string;
  balance: number;
  usdValue?: number;
  icon?: string;
}

export default function WalletScreen() {
  const { walletAddress, balance, refreshBalance, getPrivateKey, selectedAvatar, selectedNFTAvatar, snsDomain } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);
  const [activeTab, setActiveTab] = useState<'all' | 'tips' | 'games' | 'events'>('all');
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Mock activity data
  const activities = [
    {
      id: 1,
      type: 'tip_sent',
      amount: 50,
      user: 'shadowy.sol',
      userAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      context: 'Great analysis on Solana fees!',
      time: '2 hours ago',
      icon: '💸'
    },
    {
      id: 2,
      type: 'game_won',
      amount: 100,
      user: 'degen.sol',
      userAddress: 'GKJRSuAqFatpGpNcB3dQkUDddt5p5uTwYdM2qygYzRBe',
      game: 'Rock Paper Scissors',
      result: '2-1',
      time: '5 hours ago',
      icon: '🎮'
    },
    {
      id: 3,
      type: 'tip_received',
      amount: 25,
      user: 'anon.sol',
      userAddress: 'E7r83mAKJRSuAZFatpGpNcBdK3dQkTDddt5p5uUYqwY',
      context: 'Your tutorial helped me!',
      time: '1 day ago',
      icon: '💰'
    },
    {
      id: 4,
      type: 'event_joined',
      event: 'Solana Hacker House NYC',
      status: 'Whitelisted',
      time: '2 days ago',
      icon: '🎫'
    },
    {
      id: 5,
      type: 'game_lost',
      amount: -50,
      user: 'pro.sol',
      userAddress: 'aB4c9Fz2KJRSuAZFatpGpNcBdK3dQkTDddt5p5uUYqwY',
      game: 'Tic Tac Toe',
      time: '3 days ago',
      icon: '😔'
    }
  ];
  
  // Filter activities by tab
  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    if (activeTab === 'tips') return activity.type === 'tip_sent' || activity.type === 'tip_received';
    if (activeTab === 'games') return activity.type === 'game_won' || activity.type === 'game_lost';
    if (activeTab === 'events') return activity.type === 'event_joined';
    return false;
  });
  const joinDate = 'Oct 2024'; // Mock

  const handleCopyAddress = () => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Copied!', 'Wallet address copied to clipboard');
    }
  };
  
  const displayName = snsDomain || `${walletAddress?.slice(0, 4)}...${walletAddress?.slice(-4)}`;

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Base dark gradient layer (matches app background) */}
        <LinearGradient
          colors={gradients?.surface || ['rgba(30, 30, 30, 0.95)', 'rgba(40, 40, 40, 0.85)']}
          style={styles.baseBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Green overlay gradient (matches app style) */}
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
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <View style={styles.profileSection}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={gradients?.primary || ['#43e97b', '#38f9d7']}
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
            </View>
            
            {/* Identity */}
            <TouchableOpacity onPress={handleCopyAddress} activeOpacity={0.8}>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.fullAddress} numberOfLines={1}>
                {walletAddress}
              </Text>
            </TouchableOpacity>
            
            {/* Stats */}
            <View style={styles.statsRow}>
              <Text style={styles.memberSince}>Member since {joinDate}</Text>
            </View>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={gradients?.surface || ['rgba(30, 30, 30, 0.95)', 'rgba(40, 40, 40, 0.85)']}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <TouchableOpacity onPress={refreshBalance}>
                  <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceAmount}>{balance.toFixed(2)} ALLY</Text>
              
              {/* Action Buttons */}
              <View style={styles.balanceActions}>
                <TouchableOpacity 
                  style={styles.balanceActionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert('Deposit', 'Deposit functionality coming soon!');
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients?.primary || ['#43e97b', '#38f9d7']}
                    style={styles.balanceActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={isDarkMode ? '#000' : '#fff'} />
                    <Text style={styles.balanceActionText}>Deposit</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.balanceActionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert('Withdraw', 'Withdraw functionality coming soon!');
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.surface + '80', colors.surface + '60']}
                    style={[styles.balanceActionGradient, styles.secondaryBalanceButton]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={18} color={colors.text} />
                    <Text style={[styles.balanceActionText, { color: colors.text }]}>Withdraw</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Activity Tabs */}
          <View style={styles.tabsContainer}>
            {(['all', 'tips', 'games', 'events'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => {
                  setActiveTab(tab);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity List */}
          <View style={styles.activitySection}>
            {filteredActivities.map((activity, index) => (
              <TouchableOpacity 
                key={activity.id} 
                style={[
                  styles.activityItem,
                  index === filteredActivities.length - 1 && styles.lastActivityItem
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.activityIcon}>
                  <Text style={styles.activityIconText}>{activity.icon}</Text>
                </View>
                
                <View style={styles.activityContent}>
                  {activity.type === 'tip_sent' && (
                    <>
                      <Text style={styles.activityTitle}>
                        Tipped <Text style={styles.activityUser}>@{activity.user}</Text>
                      </Text>
                      <Text style={styles.activityContext} numberOfLines={1}>
                        "{activity.context}"
                      </Text>
                    </>
                  )}
                  
                  {activity.type === 'tip_received' && (
                    <>
                      <Text style={styles.activityTitle}>
                        Received tip from <Text style={styles.activityUser}>@{activity.user}</Text>
                      </Text>
                      <Text style={styles.activityContext} numberOfLines={1}>
                        "{activity.context}"
                      </Text>
                    </>
                  )}
                  
                  {activity.type === 'game_won' && (
                    <>
                      <Text style={styles.activityTitle}>
                        Won against <Text style={styles.activityUser}>@{activity.user}</Text>
                      </Text>
                      <Text style={styles.activityContext}>
                        {activity.game} • {activity.result}
                      </Text>
                    </>
                  )}
                  
                  {activity.type === 'game_lost' && (
                    <>
                      <Text style={styles.activityTitle}>
                        Lost to <Text style={styles.activityUser}>@{activity.user}</Text>
                      </Text>
                      <Text style={styles.activityContext}>
                        {activity.game}
                      </Text>
                    </>
                  )}
                  
                  {activity.type === 'event_joined' && (
                    <>
                      <Text style={styles.activityTitle}>
                        {activity.status} for {activity.event}
                      </Text>
                    </>
                  )}
                  
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
                
                {activity.amount && (
                  <Text style={[
                    styles.activityAmount,
                    activity.amount > 0 ? styles.amountPositive : styles.amountNegative
                  ]}>
                    {activity.amount > 0 ? '+' : ''}{activity.amount} ALLY
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (colors: any, isDarkMode: boolean, insets: any) => {
  
  return StyleSheet.create({
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
    greenOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: insets.top + 20,
      paddingHorizontal: 20,
      paddingBottom: 100, // Normal padding since no fixed buttons
    },
    
    // Profile Section
    profileSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    avatarGradient: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarImage: {
      width: 76,
      height: 76,
      borderRadius: 38,
    },
    avatarEmoji: {
      fontSize: 36,
    },
    avatarText: {
      fontSize: FontSizes['2xl'],
      fontFamily: Fonts.bold,
      color: isDarkMode ? '#000' : '#fff',
    },
    displayName: {
      fontSize: FontSizes.xl,
      fontFamily: Fonts.bold,
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    fullAddress: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.mono,
      color: colors.textSecondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    memberSince: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.regular,
      color: colors.textSecondary,
    },
    badge: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.medium,
      color: colors.primary,
    },
    
    // Balance Card
    balanceCard: {
      marginBottom: 24,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    balanceGradient: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    balanceLabel: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
    },
    balanceAmount: {
      fontSize: FontSizes['3xl'],
      fontFamily: Fonts.bold,
      color: colors.primary,
      marginBottom: 8,
    },
    balanceActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    balanceActionButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    balanceActionGradient: {
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    balanceActionText: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.semiBold,
      color: isDarkMode ? '#000' : '#fff',
    },
    secondaryBalanceButton: {
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    
    // Activity Tabs
    tabsContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      backgroundColor: colors.surface + '40',
      borderRadius: 16,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
    },
    activeTab: {
      backgroundColor: colors.primary + '20',
    },
    tabText: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.medium,
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.primary,
      fontFamily: Fonts.semiBold,
    },
    
    // Activity Section
    activitySection: {
      marginBottom: 24,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight + '30',
    },
    lastActivityItem: {
      borderBottomWidth: 0,
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface + '60',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    activityIconText: {
      fontSize: 20,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: FontSizes.base,
      fontFamily: Fonts.medium,
      color: colors.text,
      marginBottom: 2,
    },
    activityUser: {
      color: colors.primary,
      fontFamily: Fonts.semiBold,
    },
    activityContext: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.regular,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    activityTime: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.regular,
      color: colors.textTertiary,
    },
    activityAmount: {
      fontSize: FontSizes.base,
      fontFamily: Fonts.semiBold,
      marginLeft: 12,
    },
    amountPositive: {
      color: colors.success,
    },
    amountNegative: {
      color: colors.error,
    },
  });
};