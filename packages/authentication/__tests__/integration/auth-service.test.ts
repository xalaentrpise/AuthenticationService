import { AuthService } from '../../src/core/auth-service';
import { DevAuthProvider } from '../../src/providers/dev';
import { IDPortenProvider } from '../../src/providers/idporten';
import { BankIDProvider } from '../../src/providers/bankid';
import { JWTManager } from '../../src/core/jwt-manager';
import { RBACService } from '../../src/rbac/rbac-service';
import { ComplianceLogger } from '../../src/compliance/logger';
import { AuthServiceConfig, AuthUser } from '../../src/types';
import nock from 'nock';

describe('AuthService Integration Tests', () => {
  let authService: AuthService;
  let config: AuthServiceConfig;

  beforeEach(() => {
    config = {
      providers: [
        new DevAuthProvider({
          users: [
            {
              id: 'dev-user-1',
              name: 'Test Bruker',
              email: 'test@kommune.no',
              roles: ['citizen', 'employee'],
              permissions: ['profile:read', 'documents:read'],
              tenant: {
                id: 'oslo-kommune',
                type: 'municipality',
                name: 'Oslo Kommune',
                municipalityCode: '0301'
              }
            },
            {
              id: 'dev-user-2',
              name: 'Admin Bruker',
              email: 'admin@kommune.no',
              roles: ['admin'],
              permissions: ['*:*'],
              tenant: {
                id: 'oslo-kommune',
                type: 'municipality',
                name: 'Oslo Kommune',
                municipalityCode: '0301'
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
            name: 'citizen',
            permissions: ['profile:read', 'services:use'],
            description: 'Basic citizen access'
          },
          {
            name: 'employee',
            permissions: ['documents:read', 'reports:generate'],
            inherits: ['citizen'],
            description: 'Municipal employee'
          },
          {
            name: 'admin',
            permissions: ['*:*'],
            inherits: ['employee'],
            description: 'System administrator'
          }
        ],
        permissions: [
          { name: 'profile:read', resource: 'profile', action: 'read' },
          { name: 'services:use', resource: 'services', action: 'use' },
          { name: 'documents:read', resource: 'documents', action: 'read' },
          { name: 'reports:generate', resource: 'reports', action: 'generate' }
        ]
      },
      compliance: {
        gdprEnabled: true,
        auditLogging: true,
        encryptionKey: 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
        dataMinimization: true,
        retentionPeriod: '7 years'
      }
    };

    authService = new AuthService(config);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Full Authentication Flow', () => {
    it('should complete full auth flow with dev provider', async () => {
      // Step 1: Get login URL
      const loginUrl = await authService.getLoginUrl('dev');
      expect(loginUrl).toBe('/auth/dev/login?user=dev-user-1');

      // Step 2: Handle callback (simulate successful authentication)
      const tokens = await authService.handleCallback('dev', 'dev-user-1');
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.tokenType).toBe('Bearer');

      // Step 3: Validate the access token
      const user = await authService.validateToken(tokens.accessToken);
      
      expect(user).toBeTruthy();
      expect(user!.id).toBe('dev-user-1');
      expect(user!.name).toBe('Test Bruker');
      expect(user!.email).toBe('test@kommune.no');
      expect(user!.roles).toContain('citizen');
      expect(user!.roles).toContain('employee');

      // Step 4: Refresh the token
      const newTokens = await authService.refreshToken(tokens.refreshToken);
      
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens.accessToken).not.toBe(tokens.accessToken);

      // Step 5: Logout
      await authService.logout(user!.id);
    });

    it('should handle permission inheritance correctly', async () => {
      const tokens = await authService.handleCallback('dev', 'dev-user-1');
      const user = await authService.validateToken(tokens.accessToken);

      expect(user).toBeTruthy();
      
      // Employee should inherit citizen permissions
      expect(user!.permissions).toContain('profile:read');     // from citizen
      expect(user!.permissions).toContain('services:use');     // from citizen
      expect(user!.permissions).toContain('documents:read');   // from employee
      expect(user!.permissions).toContain('reports:generate'); // from employee
    });

    it('should handle admin permissions correctly', async () => {
      const tokens = await authService.handleCallback('dev', 'dev-user-2');
      const user = await authService.validateToken(tokens.accessToken);

      expect(user).toBeTruthy();
      expect(user!.roles).toContain('admin');
      expect(user!.permissions).toContain('*:*');
    });
  });

  describe('Multiple Provider Support', () => {
    beforeEach(() => {
      const multiProviderConfig = {
        ...config,
        providers: [
          ...config.providers,
          new IDPortenProvider({
            clientId: 'test-idporten-client',
            clientSecret: 'test-idporten-secret',
            redirectUri: 'http://localhost:3000/auth/callback',
            environment: 'test'
          }),
          new BankIDProvider({
            clientId: 'test-bankid-client',
            clientSecret: 'test-bankid-secret',
            redirectUri: 'http://localhost:3000/auth/callback',
            environment: 'test',
            merchantName: 'Test Municipality'
          })
        ]
      };

      authService = new AuthService(multiProviderConfig);
    });

    it('should list all available providers', () => {
      const providers = authService.getProviderNames();
      
      expect(providers).toContain('dev');
      expect(providers).toContain('idporten');
      expect(providers).toContain('bankid');
      expect(providers).toHaveLength(3);
    });

    it('should generate different login URLs for different providers', async () => {
      const devUrl = await authService.getLoginUrl('dev');
      const idportenUrl = await authService.getLoginUrl('idporten');
      const bankidUrl = await authService.getLoginUrl('bankid');

      expect(devUrl).toContain('dev');
      expect(idportenUrl).toContain('idporten');
      expect(bankidUrl).toContain('bankid');
      
      expect(devUrl).not.toBe(idportenUrl);
      expect(idportenUrl).not.toBe(bankidUrl);
    });

    it('should handle ID-porten authentication flow', async () => {
      // Mock ID-porten token endpoint
      nock('https://eid-exttest.difi.no')
        .post('/idporten-oidc-provider/token')
        .reply(200, {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      // Mock ID-porten userinfo endpoint
      nock('https://eid-exttest.difi.no')
        .get('/idporten-oidc-provider/userinfo')
        .reply(200, {
          sub: 'idporten-user-123',
          name: 'Ola Nordmann',
          email: 'ola.nordmann@test.no',
          'https://data.norge.no/vocabulary/municipality': '0301'
        });

      const loginUrl = await authService.getLoginUrl('idporten');
      expect(loginUrl).toContain('idporten-oidc-provider/authorize');

      const tokens = await authService.handleCallback('idporten', 'mock-auth-code');
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');

      const user = await authService.validateToken(tokens.accessToken);
      expect(user!.id).toBe('idporten-user-123');
      expect(user!.name).toBe('Ola Nordmann');
    });

    it('should handle BankID authentication flow', async () => {
      // Mock BankID token endpoint
      nock('https://auth.test.bankid.no')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'bankid-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      // Mock BankID userinfo endpoint
      nock('https://auth.test.bankid.no')
        .get('/oauth2/userinfo')
        .reply(200, {
          sub: 'bankid-user-456',
          name: 'Kari Hansen',
          email: 'kari.hansen@test.no',
          birthdate: '1980-01-01'
        });

      const loginUrl = await authService.getLoginUrl('bankid');
      expect(loginUrl).toContain('auth.test.bankid.no');

      const tokens = await authService.handleCallback('bankid', 'bankid-auth-code');
      
      expect(tokens).toHaveProperty('accessToken');
      
      const user = await authService.validateToken(tokens.accessToken);
      expect(user!.id).toBe('bankid-user-456');
      expect(user!.name).toBe('Kari Hansen');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown provider gracefully', async () => {
      await expect(authService.getLoginUrl('unknown-provider'))
        .rejects.toThrow('Provider "unknown-provider" not found');
    });

    it('should handle invalid authentication codes', async () => {
      await expect(authService.handleCallback('dev', 'invalid-code'))
        .rejects.toThrow('Invalid user ID or user not found');
    });

    it('should handle expired tokens', async () => {
      const expiredConfig = {
        ...config,
        jwt: {
          ...config.jwt,
          accessTokenTTL: '1ms'
        }
      };
      
      const expiredAuthService = new AuthService(expiredConfig);
      const tokens = await expiredAuthService.handleCallback('dev', 'dev-user-1');
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const user = await expiredAuthService.validateToken(tokens.accessToken);
      expect(user).toBeNull();
    });

    it('should handle malformed tokens', async () => {
      const user = await authService.validateToken('malformed.jwt.token');
      expect(user).toBeNull();
    });
  });

  describe('Compliance Integration', () => {
    it('should log all authentication events', async () => {
      const logSpy = jest.spyOn(ComplianceLogger.prototype, 'logAuthEvent');
      
      // Successful login
      await authService.handleCallback('dev', 'dev-user-1');
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'authentication',
          status: 'success',
          userId: 'dev-user-1',
          provider: 'dev'
        })
      );
      
      logSpy.mockRestore();
    });

    it('should log failed authentication attempts', async () => {
      const logSpy = jest.spyOn(ComplianceLogger.prototype, 'logAuthEvent');
      
      try {
        await authService.handleCallback('dev', 'invalid-user');
      } catch (error) {
        // Expected to fail
      }
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'authentication',
          status: 'failure',
          provider: 'dev'
        })
      );
      
      logSpy.mockRestore();
    });

    it('should log logout events', async () => {
      const logSpy = jest.spyOn(ComplianceLogger.prototype, 'logAuthEvent');
      
      await authService.logout('dev-user-1');
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'logout',
          status: 'success',
          userId: 'dev-user-1'
        })
      );
      
      logSpy.mockRestore();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent authentication requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        authService.handleCallback('dev', i % 2 === 0 ? 'dev-user-1' : 'dev-user-2')
      );

      const results = await Promise.all(promises);
      
      results.forEach(tokens => {
        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
      });
    });

    it('should handle rapid token validation requests', async () => {
      const tokens = await authService.handleCallback('dev', 'dev-user-1');
      
      const validationPromises = Array.from({ length: 20 }, () =>
        authService.validateToken(tokens.accessToken)
      );

      const results = await Promise.all(validationPromises);
      
      results.forEach(user => {
        expect(user).toBeTruthy();
        expect(user!.id).toBe('dev-user-1');
      });
    });

    it('should maintain state consistency across operations', async () => {
      // Perform multiple operations in sequence
      const loginUrl = await authService.getLoginUrl('dev');
      const tokens = await authService.handleCallback('dev', 'dev-user-1');
      const user1 = await authService.validateToken(tokens.accessToken);
      const newTokens = await authService.refreshToken(tokens.refreshToken);
      const user2 = await authService.validateToken(newTokens.accessToken);
      await authService.logout(user1!.id);

      // Verify consistency
      expect(user1!.id).toBe(user2!.id);
      expect(user1!.email).toBe(user2!.email);
      expect(user1!.roles).toEqual(user2!.roles);
    });
  });
});