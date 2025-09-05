import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    try {
      // Skip push token in Expo Go for SDK 53+
      if (__DEV__) {
        // Silently skip in development - no need to log every time
        return;
      }
      
      const projectId = '6f182b5a-61e8-4be6-83a4-0accb8873ca3'; // Your actual Expo project ID
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      logger.log('Push token:', token);
      
      // Send token to backend
      try {
        const authToken = await AsyncStorage.getItem('korus_auth_token');
        if (authToken) {
          await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ pushToken: token })
          });
          logger.log('Push token saved to backend');
        }
      } catch (error) {
        logger.error('Failed to save push token to backend:', error);
      }
    } catch (error) {
      logger.log('Push notifications not available in Expo Go with SDK 53+');
      // Silently fail in development - push notifications will work in production builds
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export function setupNotificationListeners() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    logger.log('Notification received:', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    logger.log('Notification response:', response);
  });

  // Return a cleanup function
  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}

export async function sendLocalNotification(content: {
  title: string;
  body: string;
  data?: any;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data || {},
    },
    trigger: null, // Show immediately
  });
}
