import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface EmailAuthConfig {
  saltRounds?: number;
  resetTokenTTL?: number; // in minutes
  userStore: IEmailUserStore;
  emailService?: IEmailService;
}

export interface EmailUser {
  id: string;
  email: string;
  hashedPassword: string;
  name?: string;
  verified?: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface IEmailUserStore {
  getUserByEmail(email: string): Promise<EmailUser | null>;
  createUser(user: Omit<EmailUser, 'id' | 'createdAt'>): Promise<EmailUser>;
  updateUser(id: string, updates: Partial<EmailUser>): Promise<EmailUser>;
  storeResetToken(email: string, token: string, expiresAt: Date): Promise<void>;
  validateResetToken(email: string, token: string): Promise<boolean>;
  clearResetToken(email: string): Promise<void>;
}

export interface IEmailService {
  sendResetEmail(email: string, resetToken: string): Promise<void>;
  sendVerificationEmail(email: string, verificationToken: string): Promise<void>;
}

export interface EmailCredentials {
  email: string;
  password: string;
}

export interface EmailRegistration extends EmailCredentials {
  name?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  email: string;
  token: string;
  newPassword: string;
}

export class EmailAuthProvider implements IAuthProvider {
  public readonly name = 'email';
  private saltRounds: number;
  private resetTokenTTL: number;
  
  constructor(private config: EmailAuthConfig) {
    this.saltRounds = config.saltRounds || 12;
    this.resetTokenTTL = config.resetTokenTTL || 60; // 60 minutes default
  }

  async getLoginUrl(state?: string): Promise<string> {
    // Email provider doesn't use redirect URLs, return a placeholder
    return '/auth/email/login';
  }

  async authenticate(credentials: string | EmailCredentials): Promise<AuthUser> {
    if (typeof credentials === 'string') {
      throw new Error('Email provider requires email and password credentials');
    }

    const { email, password } = credentials;

    try {
      const user = await this.config.userStore.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await this.config.userStore.updateUser(user.id, {
        lastLogin: new Date()
      });

      return {
        id: `email-${user.id}`,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private',
          name: 'Global Users'
        },
        provider: 'email',
        metadata: {
          verified: user.verified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Email authentication failed:', error);
      throw error;
    }
  }

  async register(registration: EmailRegistration): Promise<AuthUser> {
    const { email, password, name } = registration;

    try {
      // Check if user already exists
      const existingUser = await this.config.userStore.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Create user
      const user = await this.config.userStore.createUser({
        email,
        hashedPassword,
        name,
        verified: false
      });

      // Send verification email if email service is configured
      if (this.config.emailService) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await this.config.emailService.sendVerificationEmail(email, verificationToken);
      }

      return {
        id: `email-${user.id}`,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private',
          name: 'Global Users'
        },
        provider: 'email',
        metadata: {
          verified: user.verified,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Email registration failed:', error);
      throw error;
    }
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    const { email } = request;

    try {
      const user = await this.config.userStore.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists
        return;
      }

      if (!this.config.emailService) {
        throw new Error('Email service not configured');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.resetTokenTTL * 60 * 1000);

      // Store reset token
      await this.config.userStore.storeResetToken(email, resetToken, expiresAt);

      // Send reset email
      await this.config.emailService.sendResetEmail(email, resetToken);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  async resetPassword(reset: PasswordReset): Promise<void> {
    const { email, token, newPassword } = reset;

    try {
      // Validate reset token
      const isValidToken = await this.config.userStore.validateResetToken(email, token);
      if (!isValidToken) {
        throw new Error('Invalid or expired reset token');
      }

      const user = await this.config.userStore.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Update user password
      await this.config.userStore.updateUser(user.id, {
        hashedPassword
      });

      // Clear reset token
      await this.config.userStore.clearResetToken(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }
}