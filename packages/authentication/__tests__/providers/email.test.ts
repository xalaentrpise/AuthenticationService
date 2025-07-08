import { EmailAuthProvider } from '../../src/providers/email';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock user store
const mockUserStore = {
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  storeResetToken: jest.fn(),
  validateResetToken: jest.fn(),
  clearResetToken: jest.fn()
};

// Mock email service
const mockEmailService = {
  sendResetEmail: jest.fn(),
  sendVerificationEmail: jest.fn()
};

describe('EmailAuthProvider', () => {
  let provider: EmailAuthProvider;

  beforeEach(() => {
    provider = new EmailAuthProvider({
      userStore: mockUserStore,
      emailService: mockEmailService,
      saltRounds: 10,
      resetTokenTTL: 60
    });

    jest.clearAllMocks();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('email');
  });

  it('should return login URL', async () => {
    const url = await provider.getLoginUrl();
    expect(url).toBe('/auth/email/login');
  });

  it('should authenticate with valid credentials', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      hashedPassword: 'hashed-password',
      name: 'Test User',
      verified: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    mockUserStore.getUserByEmail.mockResolvedValue(mockUser);
    mockedBcrypt.compare.mockResolvedValue(true);
    mockUserStore.updateUser.mockResolvedValue({
      ...mockUser,
      lastLogin: new Date()
    });

    const credentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    const user = await provider.authenticate(credentials);

    expect(user.id).toBe('email-user-123');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.provider).toBe('email');
    expect(user.roles).toContain('user');
    expect(mockUserStore.updateUser).toHaveBeenCalledWith('user-123', {
      lastLogin: expect.any(Date)
    });
  });

  it('should reject invalid email', async () => {
    mockUserStore.getUserByEmail.mockResolvedValue(null);

    const credentials = {
      email: 'invalid@example.com',
      password: 'password123'
    };

    await expect(provider.authenticate(credentials))
      .rejects.toThrow('Invalid email or password');
  });

  it('should reject invalid password', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      hashedPassword: 'hashed-password',
      name: 'Test User',
      verified: true,
      createdAt: new Date()
    };

    mockUserStore.getUserByEmail.mockResolvedValue(mockUser);
    mockedBcrypt.compare.mockResolvedValue(false);

    const credentials = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(provider.authenticate(credentials))
      .rejects.toThrow('Invalid email or password');
  });

  it('should register new user', async () => {
    mockUserStore.getUserByEmail.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    
    const mockUser = {
      id: 'user-456',
      email: 'new@example.com',
      hashedPassword: 'hashed-password',
      name: 'New User',
      verified: false,
      createdAt: new Date()
    };

    mockUserStore.createUser.mockResolvedValue(mockUser);

    const registration = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User'
    };

    const user = await provider.register(registration);

    expect(user.id).toBe('email-user-456');
    expect(user.name).toBe('New User');
    expect(user.email).toBe('new@example.com');
    expect(mockUserStore.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      hashedPassword: 'hashed-password',
      name: 'New User',
      verified: false
    });
  });

  it('should reject registration with existing email', async () => {
    const existingUser = {
      id: 'user-123',
      email: 'existing@example.com',
      hashedPassword: 'hashed-password',
      name: 'Existing User',
      verified: true,
      createdAt: new Date()
    };

    mockUserStore.getUserByEmail.mockResolvedValue(existingUser);

    const registration = {
      email: 'existing@example.com',
      password: 'password123'
    };

    await expect(provider.register(registration))
      .rejects.toThrow('User with this email already exists');
  });

  it('should request password reset', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      hashedPassword: 'hashed-password',
      name: 'Test User',
      verified: true,
      createdAt: new Date()
    };

    mockUserStore.getUserByEmail.mockResolvedValue(mockUser);

    await provider.requestPasswordReset({ email: 'test@example.com' });

    expect(mockUserStore.storeResetToken).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(String),
      expect.any(Date)
    );
    expect(mockEmailService.sendResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(String)
    );
  });

  it('should not reveal non-existent email during password reset', async () => {
    mockUserStore.getUserByEmail.mockResolvedValue(null);

    await expect(provider.requestPasswordReset({ email: 'nonexistent@example.com' }))
      .resolves.not.toThrow();

    expect(mockUserStore.storeResetToken).not.toHaveBeenCalled();
    expect(mockEmailService.sendResetEmail).not.toHaveBeenCalled();
  });

  it('should reset password with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      hashedPassword: 'old-hashed-password',
      name: 'Test User',
      verified: true,
      createdAt: new Date()
    };

    mockUserStore.validateResetToken.mockResolvedValue(true);
    mockUserStore.getUserByEmail.mockResolvedValue(mockUser);
    mockedBcrypt.hash.mockResolvedValue('new-hashed-password');

    const reset = {
      email: 'test@example.com',
      token: 'valid-reset-token',
      newPassword: 'newpassword123'
    };

    await provider.resetPassword(reset);

    expect(mockUserStore.updateUser).toHaveBeenCalledWith('user-123', {
      hashedPassword: 'new-hashed-password'
    });
    expect(mockUserStore.clearResetToken).toHaveBeenCalledWith('test@example.com');
  });

  it('should reject password reset with invalid token', async () => {
    mockUserStore.validateResetToken.mockResolvedValue(false);

    const reset = {
      email: 'test@example.com',
      token: 'invalid-reset-token',
      newPassword: 'newpassword123'
    };

    await expect(provider.resetPassword(reset))
      .rejects.toThrow('Invalid or expired reset token');
  });

  it('should reject string credentials', async () => {
    await expect(provider.authenticate('string-credential'))
      .rejects.toThrow('Email provider requires email and password credentials');
  });

  it('should handle missing name in registration', async () => {
    mockUserStore.getUserByEmail.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    
    const mockUser = {
      id: 'user-456',
      email: 'new@example.com',
      hashedPassword: 'hashed-password',
      verified: false,
      createdAt: new Date()
    };

    mockUserStore.createUser.mockResolvedValue(mockUser);

    const registration = {
      email: 'new@example.com',
      password: 'password123'
      // No name provided
    };

    const user = await provider.register(registration);

    expect(user.name).toBe('new'); // Should use email prefix
  });
});