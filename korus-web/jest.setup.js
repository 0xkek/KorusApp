import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
}));

// Mock Solana wallet
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
    signMessage: jest.fn(),
  }),
  useConnection: () => ({
    connection: {},
  }),
}));
