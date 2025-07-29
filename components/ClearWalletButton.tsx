import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useKorusAlert } from './KorusAlertProvider';

export const ClearWalletButton = () => {
  const { showAlert } = useKorusAlert();

  const handleClear = async () => {
    try {
      // Clear all stored wallet data
      await SecureStore.deleteItemAsync('korus_wallet_address');
      await SecureStore.deleteItemAsync('korus_auth_token');
      await SecureStore.deleteItemAsync('korus_wallet_provider');
      await SecureStore.deleteItemAsync('mwa_auth_token');
      
      showAlert('Cleared', 'Wallet data cleared. Try connecting again.', 'success');
    } catch (error) {
      showAlert('Error', 'Failed to clear data', 'error');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleClear}>
      <Text style={styles.text}>Clear Wallet Data</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});