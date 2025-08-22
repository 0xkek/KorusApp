// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/korus_test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32-characters-long';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Cleanup after all tests
afterAll(async () => {
  // Close database connections, etc.
  await new Promise(resolve => setTimeout(resolve, 500));
});