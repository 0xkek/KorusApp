// Polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';

// Global polyfills
global.Buffer = Buffer;
global.process = process;

// TextEncoder/TextDecoder polyfill for React Native
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('text-encoding').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('text-encoding').TextDecoder;
}

// Crypto polyfill for Solana
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: require('react-native-get-random-values').getRandomValues,
  };
}