import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Text, TouchableOpacity, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const { colors, isDarkMode, gradients } = useTheme();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  // Global scroll to top function - we'll use event emitter pattern
  const handleHomeTabPress = () => {
    // Always trigger scroll to top when home is tapped
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    global.scrollToTop && global.scrollToTop();
    
    // Always reset to general category when home is tapped
    global.resetToGeneral && global.resetToGeneral();
  };

  const TabBarIcon = ({ name, color, focused, size = 24 }: { name: any, color: string, focused: boolean, size?: number }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
      {focused ? (
        <BlurView intensity={20} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <LinearGradient
            colors={gradients.primary}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
              elevation: 4,
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={name} size={size} color={isDarkMode ? '#000' : '#fff'} />
          </LinearGradient>
        </BlurView>
      ) : (
        <Ionicons name={name} size={size} color={color} />
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 10,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            ...(Platform.OS === 'ios' ? { position: 'absolute' } : {}),
          },
          tabBarBackground: () => (
            <View style={{ flex: 1 }}>
              {/* Custom theme-colored border */}
              <View 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: colors.primary,
                  zIndex: 10,
                }}
              />
              {/* Background gradient */}
              <LinearGradient
                colors={gradients.surface}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarButton: (props) => (
            <TouchableOpacity
              style={[props.style, { 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
                paddingVertical: 8,
              }]}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                props.onPress?.(e);
              }}
              activeOpacity={0.7}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              style={[props.style, { 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
                paddingVertical: 8,
              }]}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleHomeTabPress();
                props.onPress?.(e);
              }}
              activeOpacity={0.7}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "compass" : "compass-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabBarIcon name={focused ? "notifications" : "notifications-outline"} color={color} focused={focused} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#FF4444',
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "wallet" : "wallet-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
