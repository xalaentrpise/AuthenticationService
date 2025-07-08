import { SMSOTPAuthProvider } from '../../src/providers/sms-otp';
import * as crypto from 'crypto';

// Mock crypto
jest.mock('crypto');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

// Mock user store
const mockUserStore = {
  getUserByPhone: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn()
};

// Mock SMS service
const mockSMSService = {
  sendSMS: jest.fn()
};

// Mock OTP store
const mockOTPStore = {
  storeOTP: jest.fn(),
  validateOTP: jest.fn(),
  clearOTP: jest.fn(),
  getAttemptCount: jest.fn(),
  incrementAttemptCount: jest.fn(),
  clearAttemptCount: jest.fn(),
  isThrottled: jest.fn(),
  setThrottle: jest.fn()
};

// Mock crypto hash
const mockHash = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('hashed-otp')
};

describe('SMSOTPAuthProvider', () => {
  let provider: SMSOTPAuthProvider;

  beforeEach(() => {
    provider = new SMSOTPAuthProvider({
      otpLength: 6,
      otpTTL: 5,
      maxAttempts: 3,
      throttleWindow: 15,
      userStore: mockUserStore,
      smsService: mockSMSService,
      otpStore: mockOTPStore
    });

    jest.clearAllMocks();
    mockedCrypto.createHash.mockReturnValue(mockHash as any);
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('sms-otp');
  });

  it('should return login URL', async () => {
    const url = await provider.getLoginUrl();
    expect(url).toBe('/auth/sms-otp/request');
  });

  it('should authenticate with valid OTP', async () => {
    const mockUser = {
      id: 'user-123',
      phoneNumber: '+4747123456',
      name: 'Test User',
      verified: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const verification = {
      phoneNumber: '+4747123456',
      otp: '123456'
    };

    mockOTPStore.isThrottled.mockResolvedValue(false);
    mockOTPStore.getAttemptCount.mockResolvedValue(0);
    mockOTPStore.validateOTP.mockResolvedValue(true);
    mockUserStore.getUserByPhone.mockResolvedValue(mockUser);
    mockUserStore.updateUser.mockResolvedValue({
      ...mockUser,
      lastLogin: new Date()
    });

    const user = await provider.authenticate(verification);

    expect(user.id).toBe('sms-otp-user-123');
    expect(user.name).toBe('Test User');
    expect(user.metadata?.phoneNumber).toBe('+4747123456');
    expect(user.provider).toBe('sms-otp');
    expect(mockOTPStore.clearOTP).toHaveBeenCalledWith('+4747123456');
    expect(mockOTPStore.clearAttemptCount).toHaveBeenCalledWith('+4747123456');
  });

  it('should create new user if not exists', async () => {
    const verification = {
      phoneNumber: '+4747987654',
      otp: '654321'
    };

    const newUser = {
      id: 'user-456',
      phoneNumber: '+4747987654',
      verified: true,
      createdAt: new Date()
    };

    mockOTPStore.isThrottled.mockResolvedValue(false);
    mockOTPStore.getAttemptCount.mockResolvedValue(0);
    mockOTPStore.validateOTP.mockResolvedValue(true);
    mockUserStore.getUserByPhone.mockResolvedValue(null);
    mockUserStore.createUser.mockResolvedValue(newUser);

    const user = await provider.authenticate(verification);

    expect(user.id).toBe('sms-otp-user-456');
    expect(user.name).toBe('User 7654'); // Last 4 digits
    expect(mockUserStore.createUser).toHaveBeenCalledWith({
      phoneNumber: '+4747987654',
      verified: true
    });
  });

  it('should reject authentication when throttled', async () => {
    const verification = {
      phoneNumber: '+4747123456',
      otp: '123456'
    };

    mockOTPStore.isThrottled.mockResolvedValue(true);

    await expect(provider.authenticate(verification))
      .rejects.toThrow('Too many attempts. Please try again later.');
  });

  it('should throttle after max attempts', async () => {
    const verification = {
      phoneNumber: '+4747123456',
      otp: 'wrong-otp'
    };

    mockOTPStore.isThrottled.mockResolvedValue(false);
    mockOTPStore.getAttemptCount.mockResolvedValue(3); // At max attempts
    mockOTPStore.validateOTP.mockResolvedValue(false);

    await expect(provider.authenticate(verification))
      .rejects.toThrow('Too many attempts. Please try again later.');

    expect(mockOTPStore.setThrottle).toHaveBeenCalledWith(
      '+4747123456',
      expect.any(Date)
    );
    expect(mockOTPStore.clearAttemptCount).toHaveBeenCalledWith('+4747123456');
  });

  it('should increment attempt count on invalid OTP', async () => {
    const verification = {
      phoneNumber: '+4747123456',
      otp: 'wrong-otp'
    };

    mockOTPStore.isThrottled.mockResolvedValue(false);
    mockOTPStore.getAttemptCount.mockResolvedValue(1);
    mockOTPStore.validateOTP.mockResolvedValue(false);

    await expect(provider.authenticate(verification))
      .rejects.toThrow('Invalid or expired OTP');

    expect(mockOTPStore.incrementAttemptCount).toHaveBeenCalledWith('+4747123456');
  });

  it('should send OTP', async () => {
    const request = {
      phoneNumber: '+4747123456',
      name: 'Test User'
    };

    mockOTPStore.isThrottled.mockResolvedValue(false);
    
    // Mock Math.random to generate predictable OTP
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);

    await provider.sendOTP(request);

    expect(mockOTPStore.storeOTP).toHaveBeenCalledWith(
      '+4747123456',
      'hashed-otp',
      expect.any(Date)
    );

    expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
      '+4747123456',
      expect.stringContaining('Your verification code is:')
    );
  });

  it('should reject sending OTP when throttled', async () => {
    const request = {
      phoneNumber: '+4747123456'
    };

    mockOTPStore.isThrottled.mockResolvedValue(true);

    await expect(provider.sendOTP(request))
      .rejects.toThrow('Too many attempts. Please try again later.');
  });

  it('should verify OTP', async () => {
    mockOTPStore.validateOTP.mockResolvedValue(true);

    const isValid = await provider.verifyOTP('+4747123456', '123456');

    expect(isValid).toBe(true);
    expect(mockOTPStore.validateOTP).toHaveBeenCalledWith('+4747123456', '123456');
  });

  it('should handle OTP verification failure', async () => {
    mockOTPStore.validateOTP.mockRejectedValue(new Error('Store error'));

    const isValid = await provider.verifyOTP('+4747123456', '123456');

    expect(isValid).toBe(false);
  });

  it('should reject string credentials', async () => {
    await expect(provider.authenticate('string-credential'))
      .rejects.toThrow('SMS OTP provider requires phone number and OTP');
  });

  it('should handle SMS service failure', async () => {
    const request = {
      phoneNumber: '+4747123456'
    };

    mockOTPStore.isThrottled.mockResolvedValue(false);
    mockSMSService.sendSMS.mockRejectedValue(new Error('SMS service unavailable'));

    await expect(provider.sendOTP(request))
      .rejects.toThrow('Failed to send OTP');
  });

  it('should generate OTP of correct length', async () => {
    const customProvider = new SMSOTPAuthProvider({
      otpLength: 8,
      userStore: mockUserStore,
      smsService: mockSMSService,
      otpStore: mockOTPStore
    });

    mockOTPStore.isThrottled.mockResolvedValue(false);
    
    // Mock Math.random to generate predictable OTP
    jest.spyOn(Math, 'random').mockReturnValue(0.12345678);

    await customProvider.sendOTP({ phoneNumber: '+4747123456' });

    expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
      '+4747123456',
      expect.stringMatching(/\d{8}/) // 8-digit OTP
    );
  });

  it('should use default configuration values', () => {
    const defaultProvider = new SMSOTPAuthProvider({
      userStore: mockUserStore,
      smsService: mockSMSService,
      otpStore: mockOTPStore
    });

    expect(defaultProvider.name).toBe('sms-otp');
  });
});