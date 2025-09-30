// Global polyfills for React Native
// This fixes the "global location variable is not defined" error

// Import React Native crypto polyfill
import 'react-native-get-random-values';

if (typeof global !== 'undefined') {
  // Polyfill for global.location
  if (!global.location) {
    global.location = {
      protocol: 'http:',
      hostname: 'localhost',
      port: '8081',
      pathname: '/',
      search: '',
      hash: '',
      href: 'http://localhost:8081/',
      origin: 'http://localhost:8081',
      host: 'localhost:8081',
      reload: () => {},
      replace: () => {},
      assign: () => {},
      toString: () => 'http://localhost:8081/'
    };
  }

  // Polyfill for window.location if window exists
  if (typeof window !== 'undefined' && !window.location) {
    window.location = global.location;
  }

  // Crypto polyfills for Solana
  if (!global.crypto) {
    const crypto = require('crypto');
    global.crypto = {
      getRandomValues: (arr) => {
        const randomBytes = crypto.randomBytes(arr.length);
        for (let i = 0; i < arr.length; i++) {
          arr[i] = randomBytes[i];
        }
        return arr;
      }
    };
  }
}

// Export to ensure file is loaded
export default {};