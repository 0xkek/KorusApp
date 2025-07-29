import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { logger } from '../utils/logger';
import { useKorusAlert } from './KorusAlertProvider';

export const TestWalletButton = () => {
  const { showAlert } = useKorusAlert();

  const handleDirectTest = async () => {
    try {
      logger.log('Starting direct MWA test...');
      
      await transact(async (wallet) => {
        logger.log('Transact callback started');
        
        // Step 1: Authorize
        const auth = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'Korus Test',
            uri: 'https://korus-backend.onrender.com',
            icon: 'favicon.ico',
          },
        });
        
        logger.log('Auth result:', auth);
        
        // Step 2: Get address
        const addressBase64 = auth.accounts[0].address;
        const addressBytes = Buffer.from(addressBase64, 'base64');
        const pubKey = new PublicKey(addressBytes);
        const address = pubKey.toBase58();
        
        logger.log('Wallet address:', address);
        
        // Step 3: Sign message
        const message = 'Test message ' + Date.now();
        const encodedMessage = Buffer.from(message, 'utf8');
        
        const signatures = await wallet.signMessages({
          addresses: [addressBase64],
          payloads: [encodedMessage],
        });
        
        logger.log('Signatures:', signatures);
        
        showAlert('Success', `Connected: ${address.slice(0, 8)}...`, 'success');
      });
    } catch (error: any) {
      logger.error('Direct test error:', error);
      showAlert('Error', error.message, 'error');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleDirectTest}>
      <Text style={styles.text}>Test Direct MWA</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#43e97b',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  text: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});