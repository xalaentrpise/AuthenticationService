// Global test setup
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-minimum-32-characters';
  process.env.ENCRYPTION_KEY = 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
});

afterAll(async () => {
  // Clean up after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
});

// Mock external HTTP requests by default
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    }))
  }
}));

// Increase timeout for integration tests
jest.setTimeout(30000);