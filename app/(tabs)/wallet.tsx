import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { WalletConnectionModal } from '../../components/WalletConnectionModal';

export default function WalletScreen() {
  const { walletAddress, balance, refreshBalance, isConnected } = useWallet();
  const { colors, isDarkMode, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);
  const [activeTab, setActiveTab] = useState<'all' | 'tips' | 'games' | 'events'>('all');
  const [showWalletModal, setShowWalletModal] = useState(false);
  
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

  const handleWalletSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWalletModal(true);
  };

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

          {/* Wallet Settings Button */}
          <TouchableOpacity
            style={styles.seedPhraseButton}
            onPress={handleWalletSettings}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.surface}
              style={styles.seedPhraseGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.seedPhraseIconContainer}>
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.seedPhraseIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="wallet-outline" size={22} color={isDarkMode ? '#000' : '#fff'} />
                </LinearGradient>
              </View>
              <View style={styles.seedPhraseTextContainer}>
                <Text style={styles.seedPhraseTitle}>Wallet Settings</Text>
                <Text style={styles.seedPhraseSubtitle}>
                  {isConnected ? `Connected: ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}` : 'Not connected'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isVisible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
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
      paddingBottom: 100, // Reset back to original
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
      marginBottom: 16, // Reduced to bring button closer
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
    
    // Seed Phrase Button
    seedPhraseButton: {
      marginTop: 0, // No top margin - directly under activity
      marginBottom: 24,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    seedPhraseGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    seedPhraseIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: 'hidden',
      marginRight: 16,
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    seedPhraseIconGradient: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seedPhraseTextContainer: {
      flex: 1,
    },
    seedPhraseTitle: {
      fontSize: FontSizes.lg,
      fontFamily: Fonts.bold,
      color: colors.text,
      marginBottom: 4,
    },
    seedPhraseSubtitle: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.regular,
      color: colors.textSecondary,
    },
  });
};