import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings for Norwegian authentication
        locale: 'nb-NO',
        timezoneId: 'Europe/Oslo'
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        locale: 'nb-NO',
        timezoneId: 'Europe/Oslo'
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        locale: 'nb-NO',
        timezoneId: 'Europe/Oslo'
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        locale: 'nb-NO',
        timezoneId: 'Europe/Oslo'
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        locale: 'nb-NO',
        timezoneId: 'Europe/Oslo'
      },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
  
  /* Global test timeout */
  timeout: 30 * 1000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 5 * 1000
  },
  
  /* Output directory for test artifacts */
  outputDir: 'test-results/',
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./__tests__/global-setup.ts'),
  globalTeardown: require.resolve('./__tests__/global-teardown.ts'),
});