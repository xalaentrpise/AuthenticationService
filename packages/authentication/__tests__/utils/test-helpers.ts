import { AuthService } from '../../src/core/auth-service';
import { DevAuthProvider } from '../../src/providers/dev';
import { AuthServiceConfig, AuthUser, AuthTokens } from '../../src/types';

/**
 * Create a test authentication service with default configuration
 */
export function createTestAuthService(overrides: Partial<AuthServiceConfig> = {}): AuthService {
  const defaultConfig: AuthServiceConfig = {
    providers: [
      new DevAuthProvider({
        users: [
          {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
            roles: ['user'],
            permissions: ['profile:read', 'services:use'],
            tenant: {
              id: 'test-tenant',
              type: 'municipality',
              name: 'Test Municipality',
              municipalityCode: '0000'
            }
          },
          {
            id: 'test-admin',
            name: 'Test Admin',
            email: 'admin@example.com',
            roles: ['admin'],
            permissions: ['*:*'],
            tenant: {
              id: 'test-tenant',
              type: 'municipality',
              name: 'Test Municipality',
              municipalityCode: '0000'
            }
          }
        ]
      })
    ],
    jwt: {
      secret: 'test-secret-key-for-jwt-signing-minimum-32-characters',
      algorithm: 'HS256',
      accessTokenTTL: '15m',
      refreshTokenTTL: '7d'
    },
    rbac: {
      hierarchyEnabled: true,
      roles: [
        {
          name: 'user',
          permissions: ['profile:read', 'services:use'],
          description: 'Standard user'
        },
        {
          name: 'admin',
          permissions: ['*:*'],
          description: 'Administrator'
        }
      ],
      permissions: [
        { name: 'profile:read', resource: 'profile', action: 'read' },
        { name: 'services:use', resource: 'services', action: 'use' },
        { name: 'admin:manage', resource: 'admin', action: 'manage' }
      ]
    },
    compliance: {
      gdprEnabled: true,
      auditLogging: true,
      encryptionKey: 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
      dataMinimization: true,
      retentionPeriod: '7 years'
    },
    ...overrides
  };

  return new AuthService(defaultConfig);
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'mock-user-123',
    name: 'Mock User',
    email: 'mock@example.com',
    roles: ['user'],
    permissions: ['profile:read'],
    tenant: {
      id: 'mock-tenant',
      type: 'municipality',
      name: 'Mock Municipality',
      municipalityCode: '0000'
    },
    ...overrides
  };
}

/**
 * Create valid test tokens for a user
 */
export async function createTestTokens(authService: AuthService, userId: string = 'test-user-1'): Promise<AuthTokens> {
  return authService.handleCallback('dev', userId);
}

/**
 * Create an expired token for testing token expiration
 */
export async function createExpiredToken(authService: AuthService): Promise<string> {
  // Create a service with very short token expiration
  const expiredService = createTestAuthService({
    jwt: {
      secret: 'test-secret-key-for-jwt-signing-minimum-32-characters',
      algorithm: 'HS256',
      accessTokenTTL: '1ms',
      refreshTokenTTL: '2ms'
    }
  });

  const tokens = await expiredService.handleCallback('dev', 'test-user-1');
  
  // Wait for token to expire
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return tokens.accessToken;
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Generate a random string for testing
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a mock HTTP request object for testing middleware
 */
export function createMockRequest(overrides: any = {}): any {
  return {
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    get: function(header: string) {
      return this.headers[header.toLowerCase()];
    },
    ...overrides
  };
}

/**
 * Create a mock HTTP response object for testing middleware
 */
export function createMockResponse(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    locals: {}
  };
  
  return res;
}

/**
 * Create a mock next function for testing middleware
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Utility to test async functions that should throw
 */
export async function expectAsyncThrow(
  asyncFn: () => Promise<any>,
  expectedMessage?: string
): Promise<Error> {
  try {
    await asyncFn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", but got "${error.message}"`);
    }
    return error;
  }
}

/**
 * Utility to measure execution time
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  
  return { result, duration };
}

/**
 * Utility to run multiple async operations concurrently and measure performance
 */
export async function runConcurrent<T>(
  operations: (() => Promise<T>)[],
  maxConcurrency: number = 10
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    const batch = operations.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Deep freeze an object to prevent modifications during testing
 */
export function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')) {
      deepFreeze(obj[prop]);
    }
  });
  
  return obj;
}

/**
 * Utility to create test data with Norwegian-specific values
 */
export const NorwegianTestData = {
  names: ['Ola Nordmann', 'Kari Hansen', 'Erik Svendsen', 'Ingrid Larsen', 'Lars Andersen'],
  emails: ['ola@kommune.no', 'kari@fylke.no', 'erik@stat.no', 'ingrid@privat.no'],
  municipalities: [
    { code: '0301', name: 'Oslo' },
    { code: '4601', name: 'Bergen' },
    { code: '5001', name: 'Trondheim' },
    { code: '1103', name: 'Stavanger' }
  ],
  organizations: [
    'Oslo Kommune',
    'Bergen Kommune', 
    'Trondheim Kommune',
    'Stavanger Kommune',
    'Viken Fylkeskommune',
    'Vestland Fylkeskommune'
  ]
};

/**
 * Generate Norwegian-specific test user
 */
export function createNorwegianTestUser(overrides: Partial<AuthUser> = {}): AuthUser {
  const municipality = NorwegianTestData.municipalities[Math.floor(Math.random() * NorwegianTestData.municipalities.length)];
  const name = NorwegianTestData.names[Math.floor(Math.random() * NorwegianTestData.names.length)];
  const email = NorwegianTestData.emails[Math.floor(Math.random() * NorwegianTestData.emails.length)];

  return createMockUser({
    name,
    email,
    tenant: {
      id: municipality.code,
      type: 'municipality',
      name: municipality.name,
      municipalityCode: municipality.code
    },
    ...overrides
  });
}