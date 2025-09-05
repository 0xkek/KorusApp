import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { useNotifications } from '../../context/NotificationContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import { ApiService } from '../../services/api';
import { logger } from '../../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/auth';

interface Notification {
  id: string;
  type: 'like' | 'reply' | 'tip' | 'mention';
  title: string;
  message: string;
  time: string;
  read: boolean;
  fromUser: string;
  postPreview?: string;
  amount?: number;
  createdAt?: string;
}

export default function NotificationsScreen() {
  const { colors, isDarkMode, gradients } = useTheme();
  const { walletAddress } = useWallet();
  const { markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead, refreshUnreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const styles = React.useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);
  
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    
    // Make sure we have a valid auth token
    if (!AuthService.getToken()) {
      logger.log('No auth token available yet, waiting...');
      setLoading(false);
      return;
    }
    
    try {
      const response = await ApiService.notifications.getAll();
      
      if (response.notifications) {
        // Transform backend notifications to app format
        const transformedNotifications = response.notifications.map((notif: any) => ({
          id: notif.id,
          type: notif.type,
          title: getNotificationTitle(notif.type),
          message: notif.message || getNotificationMessage(notif),
          time: getTimeAgo(notif.createdAt),
          read: notif.read || false,
          fromUser: notif.fromUser?.walletAddress || notif.fromUserWallet || 'Unknown',
          postPreview: notif.post?.content,
          amount: notif.amount,
          createdAt: notif.createdAt,
        }));
        
        setNotifications(transformedNotifications);
        
        // Refresh the global unread count
        refreshUnreadCount();
      }
    } catch (error: any) {
      // Silently handle if notifications endpoint isn't available
      if (error.message?.includes('JSON Parse error')) {
        logger.log('Notifications endpoint not available yet');
      } else {
        logger.error('Failed to fetch notifications:', error);
      }
      // If API fails, show empty state
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    // Add delay to ensure auth token is set
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 500);
    
    // Set a timeout to show empty state if loading takes too long
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setNotifications([]);
      }
    }, 3000); // 3 seconds timeout
    
    return () => {
      clearTimeout(timer);
      clearTimeout(loadingTimeout);
    };
  }, [walletAddress]);
  
  // Refresh unread count when screen comes into focus
  useEffect(() => {
    const unsubscribe = () => refreshUnreadCount();
    return unsubscribe;
  }, [refreshUnreadCount]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
  };
  
  const getNotificationTitle = (type: string): string => {
    switch (type) {
      case 'like': return 'New like on your post';
      case 'reply': return 'New reply to your post';
      case 'tip': return 'You received a tip!';
      case 'mention': return 'You were mentioned';
      default: return 'New notification';
    }
  };
  
  const getNotificationMessage = (notif: any): string => {
    const username = notif.fromUser?.username || `${notif.fromUserWallet?.slice(0, 4)}...${notif.fromUserWallet?.slice(-4)}`;
    
    switch (notif.type) {
      case 'like': return `${username} liked your post`;
      case 'reply': return `${username} replied to your post`;
      case 'tip': return `${username} tipped you ${notif.amount || 0} SOL`;
      case 'mention': return `${username} mentioned you`;
      default: return 'New activity on your post';
    }
  };
  
  const getTimeAgo = (timestamp: string): string => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  };
  
  const markAsRead = async (id: string) => {
    try {
      await contextMarkAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await contextMarkAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'reply': return 'chatbubble';
      case 'tip': return 'cash';
      case 'mention': return 'at';
      default: return 'notifications';
    }
  };
  
  const getIconColor = (type: string) => {
    switch (type) {
      case 'like': return '#FF6B6B';
      case 'tip': return '#4ECDC4';
      default: return colors.primary;
    }
  };
  
  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // TODO: Navigate to the relevant post/profile
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Loading notifications...
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={[styles.markAllButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                markAllAsRead();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              All caught up!
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              When someone likes, replies, or tips your posts, you&apos;ll see it here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                { 
                  backgroundColor: notification.read ? colors.surface : colors.surface + 'CC',
                  borderColor: notification.read ? colors.border : colors.primary + '40'
                }
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: getIconColor(notification.type) + '20' }
              ]}>
                <Ionicons
                  name={getNotificationIcon(notification.type) as any}
                  size={24}
                  color={getIconColor(notification.type)}
                />
              </View>
              
              <View style={styles.contentContainer}>
                <View style={styles.topRow}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.time, { color: colors.textTertiary }]}>
                    {notification.time}
                  </Text>
                </View>
                
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {notification.message}
                </Text>
                
                {notification.postPreview && (
                  <Text style={[styles.postPreview, { color: colors.textTertiary }]} numberOfLines={1}>
                    &ldquo;{notification.postPreview.substring(0, 50)}...&rdquo;
                  </Text>
                )}
              </View>
              
              {!notification.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDarkMode: boolean, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: insets.top + 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: FontSizes.xxxl,
    fontFamily: Fonts.bold,
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  notificationItem: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
  },
  time: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  message: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  postPreview: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 150,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
});