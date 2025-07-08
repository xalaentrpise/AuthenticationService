import * as crypto from 'crypto';
import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface SMSOTPConfig {
  otpLength?: number;
  otpTTL?: number; // in minutes
  maxAttempts?: number;
  throttleWindow?: number; // in minutes
  userStore: ISMSUserStore;
  smsService: ISMSService;
  otpStore: IOTPStore;
}

export interface SMSUser {
  id: string;
  phoneNumber: string;
  name?: string;
  verified?: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface ISMSUserStore {
  getUserByPhone(phoneNumber: string): Promise<SMSUser | null>;
  createUser(user: Omit<SMSUser, 'id' | 'createdAt'>): Promise<SMSUser>;
  updateUser(id: string, updates: Partial<SMSUser>): Promise<SMSUser>;
}

export interface ISMSService {
  sendSMS(phoneNumber: string, message: string): Promise<void>;
}

export interface IOTPStore {
  storeOTP(phoneNumber: string, hashedOTP: string, expiresAt: Date): Promise<void>;
  validateOTP(phoneNumber: string, otp: string): Promise<boolean>;
  clearOTP(phoneNumber: string): Promise<void>;
  getAttemptCount(phoneNumber: string): Promise<number>;
  incrementAttemptCount(phoneNumber: string): Promise<void>;
  clearAttemptCount(phoneNumber: string): Promise<void>;
  isThrottled(phoneNumber: string): Promise<boolean>;
  setThrottle(phoneNumber: string, expiresAt: Date): Promise<void>;
}

export interface SMSOTPRequest {
  phoneNumber: string;
  name?: string;
}

export interface SMSOTPVerification {
  phoneNumber: string;
  otp: string;
}

export class SMSOTPAuthProvider implements IAuthProvider {
  public readonly name = 'sms-otp';
  private otpLength: number;
  private otpTTL: number;
  private maxAttempts: number;
  private throttleWindow: number;
  
  constructor(private config: SMSOTPConfig) {
    this.otpLength = config.otpLength || 6;
    this.otpTTL = config.otpTTL || 5; // 5 minutes default
    this.maxAttempts = config.maxAttempts || 3;
    this.throttleWindow = config.throttleWindow || 15; // 15 minutes throttle
  }

  async getLoginUrl(state?: string): Promise<string> {
    // SMS OTP provider doesn't use redirect URLs
    return '/auth/sms-otp/request';
  }

  async authenticate(verification: string | SMSOTPVerification): Promise<AuthUser> {
    if (typeof verification === 'string') {
      throw new Error('SMS OTP provider requires phone number and OTP');
    }

    const { phoneNumber, otp } = verification;

    try {
      // Check if user is throttled
      const isThrottled = await this.config.otpStore.isThrottled(phoneNumber);
      if (isThrottled) {
        throw new Error('Too many attempts. Please try again later.');
      }

      // Check attempt count
      const attemptCount = await this.config.otpStore.getAttemptCount(phoneNumber);
      if (attemptCount >= this.maxAttempts) {
        // Set throttle
        const throttleExpiry = new Date(Date.now() + this.throttleWindow * 60 * 1000);
        await this.config.otpStore.setThrottle(phoneNumber, throttleExpiry);
        await this.config.otpStore.clearAttemptCount(phoneNumber);
        throw new Error('Too many attempts. Please try again later.');
      }

      // Validate OTP
      const isValidOTP = await this.config.otpStore.validateOTP(phoneNumber, otp);
      if (!isValidOTP) {
        await this.config.otpStore.incrementAttemptCount(phoneNumber);
        throw new Error('Invalid or expired OTP');
      }

      // Clear OTP and attempt count
      await this.config.otpStore.clearOTP(phoneNumber);
      await this.config.otpStore.clearAttemptCount(phoneNumber);

      // Get or create user
      let user = await this.config.userStore.getUserByPhone(phoneNumber);
      
      if (!user) {
        // Create new user
        user = await this.config.userStore.createUser({
          phoneNumber,
          verified: true // SMS OTP implies phone verification
        });
      } else {
        // Update last login
        user = await this.config.userStore.updateUser(user.id, {
          lastLogin: new Date(),
          verified: true
        });
      }

      return {
        id: `sms-otp-${user.id}`,
        name: user.name || `User ${phoneNumber.slice(-4)}`,
        email: `${phoneNumber}@sms.local`, // Placeholder email
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private',
          name: 'Global Users'
        },
        provider: 'sms-otp',
        metadata: {
          phoneNumber: user.phoneNumber,
          verified: user.verified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('SMS OTP authentication failed:', error);
      throw error;
    }
  }

  async sendOTP(request: SMSOTPRequest): Promise<void> {
    const { phoneNumber, name } = request;

    try {
      // Check if user is throttled
      const isThrottled = await this.config.otpStore.isThrottled(phoneNumber);
      if (isThrottled) {
        throw new Error('Too many attempts. Please try again later.');
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Hash OTP for storage
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      
      // Store OTP with expiration
      const expiresAt = new Date(Date.now() + this.otpTTL * 60 * 1000);
      await this.config.otpStore.storeOTP(phoneNumber, hashedOTP, expiresAt);

      // Send SMS
      const message = `Your verification code is: ${otp}. Valid for ${this.otpTTL} minutes.`;
      await this.config.smsService.sendSMS(phoneNumber, message);
    } catch (error) {
      console.error('SMS OTP send failed:', error);
      throw new Error('Failed to send OTP');
    }
  }

  private generateOTP(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      return await this.config.otpStore.validateOTP(phoneNumber, otp);
    } catch (error) {
      return false;
    }
  }
}