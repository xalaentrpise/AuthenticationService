import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  // Clean up any global test fixtures here
  // Stop test servers, clean up test databases, etc.
  
  console.log('✅ Global test teardown completed');
}

export default globalTeardown;