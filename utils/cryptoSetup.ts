// Import this at the very top of your App.tsx or index.js
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer;

// Polyfill for TextEncoder/TextDecoder (needed for some crypto operations)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('text-encoding').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('text-encoding').TextDecoder;
}

export {};