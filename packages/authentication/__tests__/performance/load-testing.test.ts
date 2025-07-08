import { AuthService } from '../../src/core/auth-service';
import { createTestAuthService, measureTime, runConcurrent } from '../utils/test-helpers';

describe('Authentication Performance Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = createTestAuthService();
  });

  describe('Token Generation Performance', () => {
    it('should generate tokens within acceptable time limits', async () => {
      const { duration } = await measureTime(async () => {
        await authService.handleCallback('dev', 'test-user-1');
      });

      // Token generation should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent token generation', async () => {
      const operations = Array.from({ length: 50 }, () => () =>
        authService.handleCallback('dev', 'test-user-1')
      );

      const { duration } = await measureTime(async () => {
        await runConcurrent(operations, 10);
      });

      // 50 concurrent operations should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain performance with many roles and permissions', async () => {
      // Create a user with many roles and permissions
      const heavyAuthService = createTestAuthService({
        providers: [
          new (require('../../src/providers/dev').DevAuthProvider)({
            users: [{
              id: 'heavy-user',
              name: 'Heavy User',
              email: 'heavy@test.com',
              roles: Array.from({ length: 50 }, (_, i) => `role-${i}`),
              permissions: Array.from({ length: 200 }, (_, i) => `permission-${i}`),
              tenant: {
                id: 'test',
                type: 'municipality',
                name: 'Test',
                municipalityCode: '0000'
              }
            }]
          })
        ]
      });

      const { duration } = await measureTime(async () => {
        await heavyAuthService.handleCallback('dev', 'heavy-user');
      });

      // Should still complete within reasonable time even with heavy payload
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Token Validation Performance', () => {
    it('should validate tokens quickly', async () => {
      const tokens = await authService.handleCallback('dev', 'test-user-1');

      const { duration } = await measureTime(async () => {
        await authService.validateToken(tokens.accessToken);
      });

      // Token validation should be very fast
      expect(duration).toBeLessThan(50);
    });

    it('should handle high-frequency token validation', async () => {
      const tokens = await authService.handleCallback('dev', 'test-user-1');

      const operations = Array.from({ length: 100 }, () => () =>
        authService.validateToken(tokens.accessToken)
      );

      const { duration } = await measureTime(async () => {
        await runConcurrent(operations, 20);
      });

      // 100 validations should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle invalid token validation efficiently', async () => {
      const operations = Array.from({ length: 50 }, () => () =>
        authService.validateToken('invalid-token')
      );

      const { duration } = await measureTime(async () => {
        await runConcurrent(operations, 10);
      });

      // Even invalid token validation should be fast
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const tokens = await authService.handleCallback('dev', 'test-user-1');
        await authService.validateToken(tokens.accessToken);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large token payloads efficiently', async () => {
      const largeUser = {
        id: 'large-user',
        name: 'A'.repeat(1000),
        email: 'large@test.com',
        roles: Array.from({ length: 100 }, (_, i) => `role-${i}`),
        permissions: Array.from({ length: 500 }, (_, i) => `permission-${i}`),
        tenant: {
          id: 'large-tenant',
          type: 'municipality' as const,
          name: 'B'.repeat(500),
          municipalityCode: '0000'
        }
      };

      const largeAuthService = createTestAuthService({
        providers: [
          new (require('../../src/providers/dev').DevAuthProvider)({
            users: [largeUser]
          })
        ]
      });

      const { duration } = await measureTime(async () => {
        const tokens = await largeAuthService.handleCallback('dev', 'large-user');
        await largeAuthService.validateToken(tokens.accessToken);
      });

      // Large payloads should still process within reasonable time
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Concurrent User Simulation', () => {
    it('should handle realistic concurrent user load', async () => {
      // Simulate 100 concurrent users each performing multiple operations
      const userOperations = Array.from({ length: 100 }, (_, userId) => async () => {
        // Each user logs in, validates token multiple times, then logs out
        const tokens = await authService.handleCallback('dev', 'test-user-1');
        
        // Simulate multiple API calls per user
        for (let i = 0; i < 5; i++) {
          await authService.validateToken(tokens.accessToken);
        }
        
        await authService.logout(`test-user-1`);
      });

      const { duration } = await measureTime(async () => {
        await runConcurrent(userOperations, 10); // Limit concurrency to 10
      });

      // 100 simulated users should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    });

    it('should maintain accuracy under load', async () => {
      const operations = Array.from({ length: 50 }, () => async () => {
        const tokens = await authService.handleCallback('dev', 'test-user-1');
        const user = await authService.validateToken(tokens.accessToken);
        return user;
      });

      const results = await runConcurrent(operations);

      // All operations should succeed and return valid users
      results.forEach(user => {
        expect(user).toBeTruthy();
        expect(user!.id).toBe('test-user-1');
        expect(user!.name).toBe('Test User');
      });
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with number of providers', async () => {
      // Test with 1 provider
      const singleProviderService = createTestAuthService();
      const { duration: singleDuration } = await measureTime(async () => {
        await singleProviderService.getLoginUrl('dev');
      });

      // Test with multiple providers
      const multiProviderService = createTestAuthService({
        providers: [
          ...Array.from({ length: 10 }, (_, i) => 
            new (require('../../src/providers/dev').DevAuthProvider)({
              name: `dev-${i}`,
              users: [{
                id: `user-${i}`,
                name: `User ${i}`,
                email: `user${i}@test.com`,
                roles: ['user'],
                permissions: ['profile:read']
              }]
            })
          )
        ]
      });

      const { duration: multiDuration } = await measureTime(async () => {
        await multiProviderService.getLoginUrl('dev-0');
      });

      // Performance should not degrade significantly with more providers
      expect(multiDuration).toBeLessThan(singleDuration * 3);
    });

    it('should handle increasing RBAC complexity efficiently', async () => {
      // Simple RBAC configuration
      const simpleRBAC = {
        hierarchyEnabled: true,
        roles: [
          { name: 'user', permissions: ['read'], description: 'User' }
        ],
        permissions: [
          { name: 'read', resource: 'data', action: 'read' }
        ]
      };

      // Complex RBAC configuration
      const complexRBAC = {
        hierarchyEnabled: true,
        roles: Array.from({ length: 50 }, (_, i) => ({
          name: `role-${i}`,
          permissions: Array.from({ length: 10 }, (_, j) => `permission-${i}-${j}`),
          inherits: i > 0 ? [`role-${i-1}`] : [],
          description: `Role ${i}`
        })),
        permissions: Array.from({ length: 500 }, (_, i) => ({
          name: `permission-${Math.floor(i/10)}-${i%10}`,
          resource: `resource-${Math.floor(i/50)}`,
          action: `action-${i%5}`
        }))
      };

      const simpleService = createTestAuthService({ rbac: simpleRBAC });
      const complexService = createTestAuthService({ rbac: complexRBAC });

      const { duration: simpleDuration } = await measureTime(async () => {
        await simpleService.handleCallback('dev', 'test-user-1');
      });

      const { duration: complexDuration } = await measureTime(async () => {
        await complexService.handleCallback('dev', 'test-user-1');
      });

      // Complex RBAC should not cause dramatic performance degradation
      expect(complexDuration).toBeLessThan(simpleDuration * 5);
    });
  });

  describe('Resource Limits', () => {
    it('should handle maximum realistic token size', async () => {
      // Create a token with maximum realistic payload
      const maxUser = {
        id: 'max-user',
        name: 'Maximum Test User with Very Long Name That Might Appear in Real Systems',
        email: 'maximum.test.user.with.very.long.email.address@some.very.long.domain.name.com',
        roles: Array.from({ length: 20 }, (_, i) => `role-${i}-with-longer-descriptive-name`),
        permissions: Array.from({ length: 100 }, (_, i) => `permission:${i}:read:write:delete:admin`),
        tenant: {
          id: 'maximum-tenant-id-with-long-identifier',
          type: 'municipality' as const,
          name: 'Maximum Municipality Name With Very Long Descriptive Title That Includes Geographic Information',
          municipalityCode: '9999'
        }
      };

      const maxAuthService = createTestAuthService({
        providers: [
          new (require('../../src/providers/dev').DevAuthProvider)({
            users: [maxUser]
          })
        ]
      });

      const { duration } = await measureTime(async () => {
        const tokens = await maxAuthService.handleCallback('dev', 'max-user');
        await maxAuthService.validateToken(tokens.accessToken);
      });

      // Even maximum realistic tokens should process quickly
      expect(duration).toBeLessThan(500);
    });
  });
});