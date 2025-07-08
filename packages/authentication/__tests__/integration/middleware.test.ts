import express, { Express } from 'express';
import request from 'supertest';
import { withAuthContext, requirePermission } from '../../src/middleware/auth-context';
import { AuthService } from '../../src/core/auth-service';
import { DevAuthProvider } from '../../src/providers/dev';
import { AuthServiceConfig } from '../../src/types';

describe('Authentication Middleware Integration', () => {
  let app: Express;
  let authService: AuthService;
  let config: AuthServiceConfig;

  beforeEach(() => {
    config = {
      providers: [
        new DevAuthProvider({
          users: [
            {
              id: 'user-1',
              name: 'Regular User',
              email: 'user@test.no',
              roles: ['citizen'],
              permissions: ['profile:read', 'services:use'],
              tenant: {
                id: 'oslo',
                type: 'municipality',
                name: 'Oslo',
                municipalityCode: '0301'
              }
            },
            {
              id: 'admin-1',
              name: 'Admin User',
              email: 'admin@test.no',
              roles: ['admin'],
              permissions: ['*:*'],
              tenant: {
                id: 'oslo',
                type: 'municipality',
                name: 'Oslo',
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
            name: 'admin',
            permissions: ['*:*'],
            description: 'Administrator with full access'
          }
        ],
        permissions: [
          { name: 'profile:read', resource: 'profile', action: 'read' },
          { name: 'services:use', resource: 'services', action: 'use' },
          { name: 'admin:manage', resource: 'admin', action: 'manage' }
        ]
      }
    };

    authService = new AuthService(config);

    app = express();
    app.use(express.json());

    // Apply auth middleware
    app.use(withAuthContext({
      jwtSecret: config.jwt.secret,
      skipPaths: ['/health', '/public'],
      authService
    }));

    // Public routes (no auth required)
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/public', (req, res) => {
      res.json({ message: 'public endpoint' });
    });

    // Protected routes
    app.get('/profile', (req: any, res) => {
      res.json({
        user: req.authContext?.user,
        hasContext: !!req.authContext
      });
    });

    // Permission-protected routes
    app.get('/admin', requirePermission('admin:manage'), (req: any, res) => {
      res.json({
        message: 'admin access granted',
        user: req.authContext.user.id
      });
    });

    app.get('/services', requirePermission('services:use'), (req: any, res) => {
      res.json({
        message: 'services access granted',
        user: req.authContext.user.id
      });
    });

    // Context-aware permission route
    app.get('/documents/:municipalityCode', 
      requirePermission('documents:read', (req: any) => ({
        municipalityCode: req.params.municipalityCode
      })),
      (req: any, res) => {
        res.json({
          message: 'document access granted',
          municipality: req.params.municipalityCode
        });
      }
    );

    // Error handling
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
      });
    });
  });

  describe('Public Routes', () => {
    it('should allow access to health endpoint without auth', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });

    it('should allow access to public endpoints without auth', async () => {
      const response = await request(app)
        .get('/public')
        .expect(200);

      expect(response.body).toEqual({ message: 'public endpoint' });
    });
  });

  describe('Protected Routes', () => {
    it('should require authentication for protected routes', async () => {
      await request(app)
        .get('/profile')
        .expect(401);
    });

    it('should allow access with valid token', async () => {
      // Get a valid token
      const tokens = await authService.handleCallback('dev', 'user-1');

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.hasContext).toBe(true);
      expect(response.body.user.id).toBe('user-1');
      expect(response.body.user.name).toBe('Regular User');
    });

    it('should reject invalid tokens', async () => {
      await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject malformed authorization headers', async () => {
      await request(app)
        .get('/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should allow access when user has required permission', async () => {
      const tokens = await authService.handleCallback('dev', 'user-1');

      const response = await request(app)
        .get('/services')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('services access granted');
      expect(response.body.user).toBe('user-1');
    });

    it('should deny access when user lacks required permission', async () => {
      const tokens = await authService.handleCallback('dev', 'user-1');

      await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(403);
    });

    it('should allow admin access for admin users', async () => {
      const tokens = await authService.handleCallback('dev', 'admin-1');

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('admin access granted');
      expect(response.body.user).toBe('admin-1');
    });

    it('should allow admin wildcard permissions', async () => {
      const tokens = await authService.handleCallback('dev', 'admin-1');

      const response = await request(app)
        .get('/services')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('services access granted');
    });
  });

  describe('Context-Aware Permissions', () => {
    beforeEach(() => {
      // Add a user with context-restricted permissions
      const contextUser = {
        id: 'context-user',
        name: 'Context User',
        email: 'context@test.no',
        roles: ['employee'],
        permissions: ['documents:read'],
        tenant: {
          id: 'oslo',
          type: 'municipality' as const,
          name: 'Oslo',
          municipalityCode: '0301'
        }
      };

      (config.providers[0] as DevAuthProvider).users.push(contextUser);
    });

    it('should allow access when context matches', async () => {
      const tokens = await authService.handleCallback('dev', 'context-user');

      const response = await request(app)
        .get('/documents/0301')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('document access granted');
      expect(response.body.municipality).toBe('0301');
    });

    it('should deny access when context does not match', async () => {
      const tokens = await authService.handleCallback('dev', 'context-user');

      await request(app)
        .get('/documents/0201') // Different municipality
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(403);
    });
  });

  describe('Token Handling', () => {
    it('should extract token from Authorization header', async () => {
      const tokens = await authService.handleCallback('dev', 'user-1');

      await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);
    });

    it('should extract token from cookie', async () => {
      const tokens = await authService.handleCallback('dev', 'user-1');

      await request(app)
        .get('/profile')
        .set('Cookie', `access_token=${tokens.accessToken}`)
        .expect(200);
    });

    it('should prefer Authorization header over cookie', async () => {
      const tokens = await authService.handleCallback('dev', 'user-1');
      const adminTokens = await authService.handleCallback('dev', 'admin-1');

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .set('Cookie', `access_token=${adminTokens.accessToken}`)
        .expect(200);

      // Should use user-1 token from Authorization header, not admin token from cookie
      expect(response.body.user.id).toBe('user-1');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle expired tokens gracefully', async () => {
      const expiredConfig = {
        ...config,
        jwt: { ...config.jwt, accessTokenTTL: '1ms' }
      };
      const expiredAuthService = new AuthService(expiredConfig);
      const tokens = await expiredAuthService.handleCallback('dev', 'user-1');

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);
    });

    it('should handle corrupted tokens', async () => {
      await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer corrupted.jwt.token.data')
        .expect(401);
    });

    it('should handle missing user data', async () => {
      // Create token for non-existent user
      const fakeToken = await authService['jwtManager'].generateTokens({
        id: 'non-existent-user',
        name: 'Fake User',
        email: 'fake@test.no',
        roles: [],
        permissions: []
      });

      await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${fakeToken.accessToken}`)
        .expect(401);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent authenticated requests', async () => {
      const userTokens = await authService.handleCallback('dev', 'user-1');
      const adminTokens = await authService.handleCallback('dev', 'admin-1');

      const requests = [
        request(app).get('/profile').set('Authorization', `Bearer ${userTokens.accessToken}`),
        request(app).get('/services').set('Authorization', `Bearer ${userTokens.accessToken}`),
        request(app).get('/admin').set('Authorization', `Bearer ${adminTokens.accessToken}`),
        request(app).get('/profile').set('Authorization', `Bearer ${adminTokens.accessToken}`)
      ];

      const responses = await Promise.all(requests);

      expect(responses[0].status).toBe(200); // user profile
      expect(responses[1].status).toBe(200); // user services
      expect(responses[2].status).toBe(200); // admin access
      expect(responses[3].status).toBe(200); // admin profile

      expect(responses[0].body.user.id).toBe('user-1');
      expect(responses[3].body.user.id).toBe('admin-1');
    });

    it('should maintain request isolation', async () => {
      const tokens = await authService.handleCallback('dev', 'user-1');

      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/profile')
          .set('Authorization', `Bearer ${tokens.accessToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user.id).toBe('user-1');
        expect(response.body.hasContext).toBe(true);
      });
    });
  });
});