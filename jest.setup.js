// Jest setup file

// Set required environment variables for tests
process.env.EXPO_PUBLIC_SOLANA_NETWORK = 'devnet';
process.env.EXPO_PUBLIC_ALLY_TOKEN_ADDRESS = 'test-token-address';
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';

// Mock Solana web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn().mockResolvedValue(1000000000),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
  })),
  PublicKey: jest.fn().mockImplementation((key) => ({ 
    toString: () => key,
    toBase58: () => key,
  })),
  Transaction: jest.fn(),
  SystemProgram: {
    transfer: jest.fn(),
  },
  clusterApiUrl: jest.fn((network) => `https://api.${network}.solana.com`),
  LAMPORTS_PER_SOL: 1000000000,
}));

// Mock expo modules
jest.mock('expo-font');
jest.mock('expo-asset');
jest.mock('expo-constants', () => ({
  Constants: {
    manifest: {},
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock expo-video
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    playing: false,
  })),
  VideoView: 'VideoView',
}));

// Mock useSNSDomain hook
jest.mock('./hooks/useSNSDomain', () => ({
  useSNSDomain: jest.fn(() => ({ 
    domain: null, 
    loading: false 
  })),
  useDisplayName: jest.fn((address) => {
    if (!address) return 'Unknown';
    if (address.includes && address.includes('...')) return address;
    if (!address.slice) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }),
  formatWalletAddress: jest.fn((address) => {
    if (!address) return 'Unknown';
    if (address.includes && address.includes('...')) return address;
    if (!address.slice) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  })
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSearchParams: () => ({}),
  usePathname: () => '/',
  Stack: {
    Screen: ({ children }) => children,
  },
  Tabs: {
    Screen: ({ children }) => children,
  },
}));

// Silence console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:') &&
      !args[0].includes('Each child in a list')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
  
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});