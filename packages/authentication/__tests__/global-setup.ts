import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Set up any global test fixtures here
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'global-test-secret-key-for-jwt-signing-minimum-32-characters';
  process.env.ENCRYPTION_KEY = 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
  
  // You could start a test database, test servers, etc. here
  console.log('✅ Global test setup completed');
}

export default globalSetup;