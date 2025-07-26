// Polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer;

// Keep crypto for potential future use (lightweight)
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: require('react-native-get-random-values').getRandomValues,
  };
}