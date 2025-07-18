import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import Header from '../../components/Header';
import ParticleSystem from '../../components/ParticleSystem';

interface Notification {
  id: string;
  type: 'like' | 'reply' | 'tip' | 'bump' | 'follow' | 'mention';
  title: string;
  message: string;
  time: string;
  read: boolean;
  fromUser: string;
  postPreview?: string;
  amount?: number; // for tips
}

export default function NotificationsScreen() {
  const { colors, isDarkMode, gradients } = useTheme();
  
  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'tip',
      title: 'You received a tip!',
      message: 'tipped you 5 $ALLY',
      time: '2m ago',
      read: false,
      fromUser: 'zR8f...kL3m',
      postPreview: 'Been struggling with imposter syndrome...',
      amount: 5,
    },
    {
      id: '2',
      type: 'like',
      title: 'New like on your post',
      message: 'liked your post',
      time: '15m ago',
      read: false,
      fromUser: 'mH5t...rK8j',
      postPreview: 'Just hit my first $10K in crypto gains...',
    },
    {
      id: '3',
      type: 'reply',
      title: 'New reply to your post',
      message: 'replied: "This is so true! I felt the same way..."',
      time: '1h ago',
      read: true,
      fromUser: 'nQ7p...vX9w',
      postPreview: 'Been struggling with imposter syndrome...',
    },
    {
      id: '4',
      type: 'bump',
      title: 'Your post was bumped!',
      message: 'bumped your post',
      time: '3h ago',
      read: true,
      fromUser: 'aB4c...9Fz2',
      postPreview: 'Pro tip: Before every difficult conversation...',
    },
    {
      id: '5',
      type: 'mention',
      title: 'You were mentioned',
      message: 'mentioned you in a post',
      time: '5h ago',
      read: true,
      fromUser: 'cG7h...xN3p',
    },
  ]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'reply':
        return 'chatbubble';
      case 'tip':
        return 'cash';
      case 'bump':
        return 'trending-up';
      case 'follow':
        return 'person-add';
      case 'mention':
        return 'at';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return '#FF4444';
      case 'reply':
        return colors.primary;
      case 'tip':
        return '#FFD700';
      case 'bump':
        return '#00D4FF';
      case 'follow':
        return '#9945FF';
      case 'mention':
        return '#FF6B9D';
      default:
        return colors.primary;
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    // Navigate to relevant screen based on type
    // TODO: Implement navigation
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ParticleSystem>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Background gradients */}
        <LinearGradient
          colors={gradients.surface}
          style={styles.baseBackground}
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
        <View style={[styles.header, { paddingTop: 50 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.unreadText, { color: isDarkMode ? '#000' : '#fff' }]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name="notifications-off-outline" 
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No notifications yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                When someone interacts with your posts, you'll see it here
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && [
                    styles.unreadItem,
                    { borderColor: colors.primary + '4D' }
                  ],
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!notification.read ? [
                    colors.primary + '10',
                    colors.secondary + '08',
                  ] : ['transparent', 'transparent']}
                  style={styles.notificationGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.notificationContent}>
                    <View style={[
                      styles.iconContainer,
                      { backgroundColor: getNotificationColor(notification.type) + '20' }
                    ]}>
                      <Ionicons
                        name={getNotificationIcon(notification.type)}
                        size={20}
                        color={getNotificationColor(notification.type)}
                      />
                    </View>
                    
                    <View style={styles.textContent}>
                      <View style={styles.topRow}>
                        <Text style={[styles.fromUser, { color: colors.primary }]}>
                          {notification.fromUser}
                        </Text>
                        <Text style={[styles.time, { color: colors.textTertiary }]}>
                          {notification.time}
                        </Text>
                      </View>
                      
                      <Text style={[styles.message, { color: colors.textSecondary }]}>
                        {notification.message}
                        {notification.amount && (
                          <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>
                            {' '}({notification.amount} $ALLY)
                          </Text>
                        )}
                      </Text>
                      
                      {notification.postPreview && (
                        <Text 
                          style={[styles.postPreview, { color: colors.textTertiary }]} 
                          numberOfLines={1}
                        >
                          "{notification.postPreview}"
                        </Text>
                      )}
                    </View>
                    
                    {!notification.read && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </ParticleSystem>
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
  greenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  unreadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  unreadItem: {
    borderWidth: 1,
  },
  notificationGradient: {
    borderRadius: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fromUser: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  time: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  message: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  postPreview: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginTop: 6,
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    right: 16,
    top: 16,
  },
});