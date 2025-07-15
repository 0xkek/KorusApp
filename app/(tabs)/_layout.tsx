import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Platform, Text, TouchableOpacity } from 'react-native';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const lastTapTime = useRef(0);
  const DOUBLE_TAP_DELAY = 300; // 300ms for double tap

  // Global scroll to top function - we'll use event emitter pattern
  const handleHomeTabPress = () => {
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - trigger scroll to top
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Emit custom event for home screen to listen to
      global.scrollToTop && global.scrollToTop();
    }
    lastTapTime.current = now;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00ff88',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#333333',
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            style={props.style}
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
            <Text style={{ color, fontSize: 20, fontWeight: focused ? 'bold' : 'normal' }}>
              🏠
            </Text>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              style={props.style}
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
            <Text style={{ color, fontSize: 20, fontWeight: focused ? 'bold' : 'normal' }}>
              🔍
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
