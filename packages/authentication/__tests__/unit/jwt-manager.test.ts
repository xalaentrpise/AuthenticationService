import { JWTManager } from '../../src/core/jwt-manager';
import { JWTConfig, AuthUser } from '../../src/types';
import * as jwt from 'jsonwebtoken';

describe('JWTManager', () => {
  let jwtManager: JWTManager;
  let config: JWTConfig;
  let mockUser: AuthUser;

  beforeEach(() => {
    config = {
      secret: 'test-secret-key-for-jwt-signing-minimum-32-characters',
      algorithm: 'HS256',
      accessTokenTTL: '15m',
      refreshTokenTTL: '7d',
      issuer: 'test-issuer',
      audience: 'test-audience'
    };

    jwtManager = new JWTManager(config);

    mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['user', 'admin'],
      permissions: ['read:profile', 'write:profile'],
      tenant: {
        id: 'tenant-1',
        type: 'municipality',
        name: 'Oslo Kommune',
        municipalityCode: '0301'
      }
    };
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should include user information in access token', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.accessToken) as any;

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.name).toBe(mockUser.name);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.roles).toEqual(mockUser.roles);
      expect(decoded.permissions).toEqual(mockUser.permissions);
      expect(decoded.tenant).toEqual(mockUser.tenant);
      expect(decoded.type).toBe('access');
    });

    it('should create refresh token with minimal payload', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.refreshToken) as any;

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.type).toBe('refresh');
      expect(decoded).not.toHaveProperty('email');
      expect(decoded).not.toHaveProperty('roles');
    });

    it('should handle users with no roles or permissions', async () => {
      const userWithoutRoles = {
        ...mockUser,
        roles: undefined,
        permissions: undefined
      };

      const tokens = await jwtManager.generateTokens(userWithoutRoles);
      const decoded = jwt.decode(tokens.accessToken) as any;

      expect(decoded.roles).toEqual([]);
      expect(decoded.permissions).toEqual([]);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode valid access token', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);
      const verifiedUser = await jwtManager.verifyToken(tokens.accessToken);

      expect(verifiedUser.id).toBe(mockUser.id);
      expect(verifiedUser.name).toBe(mockUser.name);
      expect(verifiedUser.email).toBe(mockUser.email);
      expect(verifiedUser.roles).toEqual(mockUser.roles);
      expect(verifiedUser.permissions).toEqual(mockUser.permissions);
      expect(verifiedUser.tenant).toEqual(mockUser.tenant);
    });

    it('should throw error for invalid token', async () => {
      await expect(jwtManager.verifyToken('invalid-token'))
        .rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      const expiredConfig = { ...config, accessTokenTTL: '1ms' };
      const expiredJwtManager = new JWTManager(expiredConfig);
      
      const tokens = await expiredJwtManager.generateTokens(mockUser);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await expect(jwtManager.verifyToken(tokens.accessToken))
        .rejects.toThrow('Invalid token');
    });

    it('should throw error for token signed with different secret', async () => {
      const differentConfig = { ...config, secret: 'different-secret-key-that-is-long-enough' };
      const differentJwtManager = new JWTManager(differentConfig);
      
      const tokens = await differentJwtManager.generateTokens(mockUser);
      
      await expect(jwtManager.verifyToken(tokens.accessToken))
        .rejects.toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);
      const verifiedUser = await jwtManager.verifyRefreshToken(tokens.refreshToken);

      expect(verifiedUser.id).toBe(mockUser.id);
      expect(verifiedUser.name).toBe('');
      expect(verifiedUser.email).toBe('');
      expect(verifiedUser.roles).toEqual([]);
      expect(verifiedUser.permissions).toEqual([]);
    });

    it('should reject access token as refresh token', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);
      
      await expect(jwtManager.verifyRefreshToken(tokens.accessToken))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(jwtManager.verifyRefreshToken('invalid-refresh-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', async () => {
      const tokens = await jwtManager.generateTokens(mockUser);
      const decoded = await jwtManager.decodeToken(tokens.accessToken);

      expect(decoded).toBeTruthy();
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.type).toBe('access');
    });

    it('should decode expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 },
        config.secret
      );

      const decoded = await jwtManager.decodeToken(expiredToken);
      expect(decoded).toBeTruthy();
      expect(decoded.sub).toBe('user-123');
    });

    it('should return null for malformed token', async () => {
      const decoded = await jwtManager.decodeToken('malformed.token');
      expect(decoded).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very long user names and emails', async () => {
      const userWithLongFields = {
        ...mockUser,
        name: 'A'.repeat(1000),
        email: 'a'.repeat(950) + '@example.com'
      };

      const tokens = await jwtManager.generateTokens(userWithLongFields);
      expect(tokens.accessToken).toBeTruthy();
      
      const verifiedUser = await jwtManager.verifyToken(tokens.accessToken);
      expect(verifiedUser.name).toBe(userWithLongFields.name);
      expect(verifiedUser.email).toBe(userWithLongFields.email);
    });

    it('should handle users with many roles and permissions', async () => {
      const userWithManyRoles = {
        ...mockUser,
        roles: Array.from({ length: 100 }, (_, i) => `role-${i}`),
        permissions: Array.from({ length: 200 }, (_, i) => `permission-${i}`)
      };

      const tokens = await jwtManager.generateTokens(userWithManyRoles);
      const verifiedUser = await jwtManager.verifyToken(tokens.accessToken);
      
      expect(verifiedUser.roles).toHaveLength(100);
      expect(verifiedUser.permissions).toHaveLength(200);
    });

    it('should handle special characters in user data', async () => {
      const userWithSpecialChars = {
        ...mockUser,
        name: 'Åse Øl-Hansen ñ 测试',
        email: 'åse+test@münchen.de'
      };

      const tokens = await jwtManager.generateTokens(userWithSpecialChars);
      const verifiedUser = await jwtManager.verifyToken(tokens.accessToken);
      
      expect(verifiedUser.name).toBe(userWithSpecialChars.name);
      expect(verifiedUser.email).toBe(userWithSpecialChars.email);
    });
  });
});