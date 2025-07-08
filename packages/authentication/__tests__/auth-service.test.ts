import { AuthService } from '../src/core/auth-service';
import { DevAuthProvider } from '../src/providers/dev-auth';
import { AuthServiceConfig } from '../src/types';

describe('AuthService', () => {
  let authService: AuthService;
  let config: AuthServiceConfig;

  beforeEach(() => {
    config = {
      providers: [
        new DevAuthProvider({
          users: [
            { id: '1', name: 'Test User', email: 'test@example.com', roles: ['user'] }
          ]
        })
      ],
      jwt: {
        secret: 'test-secret-key-for-jwt-signing-at-least-32-chars',
        algorithm: 'HS256',
        issuer: 'test-issuer',
        audience: 'test-audience'
      }
    };

    authService = new AuthService(config);
  });

  describe('getLoginUrl', () => {
    it('should return login URL for valid provider', async () => {
      const url = await authService.getLoginUrl('dev');
      expect(url).toContain('/auth/dev/login');
    });

    it('should throw error for invalid provider', async () => {
      await expect(authService.getLoginUrl('invalid')).rejects.toThrow('Provider invalid not found');
    });
  });

  describe('handleCallback', () => {
    it('should handle successful authentication', async () => {
      const tokens = await authService.handleCallback('dev', '1');
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.tokenType).toBe('Bearer');
    });

    it('should throw error for invalid user', async () => {
      await expect(authService.handleCallback('dev', 'invalid')).rejects.toThrow();
    });
  });

  describe('validateToken', () => {
    it('should validate valid JWT token', async () => {
      const tokens = await authService.handleCallback('dev', '1');
      const user = await authService.validateToken(tokens.accessToken);
      
      expect(user).toBeTruthy();
      expect(user?.id).toBe('1');
    });

    it('should return null for invalid token', async () => {
      const user = await authService.validateToken('invalid-token');
      expect(user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid token', async () => {
      const tokens = await authService.handleCallback('dev', '1');
      const newTokens = await authService.refreshToken(tokens.refreshToken);
      
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens.accessToken).not.toBe(tokens.accessToken);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('provider management', () => {
    it('should return list of provider names', () => {
      const providers = authService.getProviderNames();
      expect(providers).toContain('dev');
    });
  });

  describe('events', () => {
    it('should emit login event on successful authentication', async () => {
      const loginSpy = jest.fn();
      authService.on('login', loginSpy);
      
      await authService.handleCallback('dev', '1');
      
      expect(loginSpy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({ id: '1' }),
        provider: 'dev'
      }));
    });

    it('should emit logout event', async () => {
      const logoutSpy = jest.fn();
      authService.on('logout', logoutSpy);
      
      await authService.logout('1');
      
      expect(logoutSpy).toHaveBeenCalledWith(expect.objectContaining({
        userId: '1'
      }));
    });
  });
});
