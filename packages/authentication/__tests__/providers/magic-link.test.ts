import { MagicLinkAuthProvider } from '../../src/providers/magic-link';
import * as jwt from 'jsonwebtoken';

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Mock user store
const mockUserStore = {
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn()
};

// Mock email service
const mockEmailService = {
  sendMagicLink: jest.fn()
};

describe('MagicLinkAuthProvider', () => {
  let provider: MagicLinkAuthProvider;

  beforeEach(() => {
    provider = new MagicLinkAuthProvider({
      jwtSecret: 'test-secret',
      linkTTL: 15,
      userStore: mockUserStore,
      emailService: mockEmailService,
      baseUrl: 'https://example.com'
    });

    jest.clearAllMocks();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('magic-link');
  });

  it('should return login URL', async () => {
    const url = await provider.getLoginUrl();
    expect(url).toBe('/auth/magic-link/request');
  });

  it('should authenticate with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      verified: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const tokenPayload = {
      type: 'magic-link',
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900
    };

    mockedJwt.verify.mockReturnValue(tokenPayload);
    mockUserStore.getUserByEmail.mockResolvedValue(mockUser);
    mockUserStore.updateUser.mockResolvedValue({
      ...mockUser,
      lastLogin: new Date()
    });

    const user = await provider.authenticate('valid-magic-link-token');

    expect(user.id).toBe('magic-link-user-123');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.provider).toBe('magic-link');
    expect(user.metadata?.verified).toBe(true);
  });

  it('should create new user if not exists', async () => {
    const tokenPayload = {
      type: 'magic-link',
      email: 'new@example.com',
      name: 'New User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900
    };

    const newUser = {
      id: 'user-456',
      email: 'new@example.com',
      name: 'New User',
      verified: true,
      createdAt: new Date()
    };

    mockedJwt.verify.mockReturnValue(tokenPayload);
    mockUserStore.getUserByEmail.mockResolvedValue(null);
    mockUserStore.createUser.mockResolvedValue(newUser);

    const user = await provider.authenticate('valid-magic-link-token');

    expect(user.id).toBe('magic-link-user-456');
    expect(mockUserStore.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      name: 'New User',
      verified: true
    });
  });

  it('should reject invalid token type', async () => {
    const tokenPayload = {
      type: 'invalid-type',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockedJwt.verify.mockReturnValue(tokenPayload);

    await expect(provider.authenticate('invalid-token-type'))
      .rejects.toThrow('Invalid token type');
  });

  it('should reject expired token', async () => {
    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.TokenExpiredError('Token expired', new Date());
    });

    await expect(provider.authenticate('expired-token'))
      .rejects.toThrow('Invalid or expired magic link');
  });

  it('should reject malformed token', async () => {
    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('Malformed token');
    });

    await expect(provider.authenticate('malformed-token'))
      .rejects.toThrow('Invalid or expired magic link');
  });

  it('should send magic link', async () => {
    mockedJwt.sign.mockReturnValue('generated-magic-link-token');

    const request = {
      email: 'user@example.com',
      name: 'User Name'
    };

    await provider.sendMagicLink(request);

    expect(mockedJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'magic-link',
        email: 'user@example.com',
        name: 'User Name'
      }),
      'test-secret'
    );

    expect(mockEmailService.sendMagicLink).toHaveBeenCalledWith(
      'user@example.com',
      'https://example.com/auth/magic-link/verify?token=generated-magic-link-token'
    );
  });

  it('should verify magic link token', async () => {
    const tokenPayload = {
      type: 'magic-link',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900
    };

    mockedJwt.verify.mockReturnValue(tokenPayload);

    const isValid = await provider.verifyMagicLink('valid-token');

    expect(isValid).toBe(true);
  });

  it('should reject invalid magic link token during verification', async () => {
    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('Invalid token');
    });

    const isValid = await provider.verifyMagicLink('invalid-token');

    expect(isValid).toBe(false);
  });

  it('should handle missing name in token', async () => {
    const tokenPayload = {
      type: 'magic-link',
      email: 'test@example.com',
      // Missing name
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      verified: true,
      createdAt: new Date()
    };

    mockedJwt.verify.mockReturnValue(tokenPayload);
    mockUserStore.getUserByEmail.mockResolvedValue(null);
    mockUserStore.createUser.mockResolvedValue(mockUser);

    const user = await provider.authenticate('token-without-name');

    expect(user.name).toBe('test'); // Should use email prefix
  });

  it('should handle email service failure', async () => {
    mockEmailService.sendMagicLink.mockRejectedValue(new Error('Email service unavailable'));

    const request = {
      email: 'user@example.com',
      name: 'User Name'
    };

    await expect(provider.sendMagicLink(request))
      .rejects.toThrow('Failed to send magic link');
  });

  it('should generate tokens with correct TTL', async () => {
    const mockNow = 1640995200; // Fixed timestamp
    jest.spyOn(Date, 'now').mockReturnValue(mockNow * 1000);

    mockedJwt.sign.mockImplementation((payload: any) => {
      expect(payload.iat).toBe(mockNow);
      expect(payload.exp).toBe(mockNow + 900); // 15 minutes
      return 'token';
    });

    await provider.sendMagicLink({
      email: 'test@example.com',
      name: 'Test'
    });

    expect(mockedJwt.sign).toHaveBeenCalled();
  });
});