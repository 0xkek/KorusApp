import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useWallet } from '../context/WalletContext';

export default function InitialScreen() {
  const router = useRouter();
  const { hasWallet, isLoading } = useWallet();

  useEffect(() => {
    if (!isLoading) {
      if (hasWallet) {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
    }
  }, [hasWallet, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
      <ActivityIndicator size="large" color="#43e97b" />
    </View>
  );
}