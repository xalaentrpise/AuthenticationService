import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface MagicLinkConfig {
  jwtSecret: string;
  linkTTL?: number; // in minutes
  userStore: IMagicLinkUserStore;
  emailService: IMagicLinkEmailService;
  baseUrl: string;
}

export interface MagicLinkUser {
  id: string;
  email: string;
  name?: string;
  verified?: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface IMagicLinkUserStore {
  getUserByEmail(email: string): Promise<MagicLinkUser | null>;
  createUser(user: Omit<MagicLinkUser, 'id' | 'createdAt'>): Promise<MagicLinkUser>;
  updateUser(id: string, updates: Partial<MagicLinkUser>): Promise<MagicLinkUser>;
}

export interface IMagicLinkEmailService {
  sendMagicLink(email: string, magicLink: string): Promise<void>;
}

export interface MagicLinkRequest {
  email: string;
  name?: string;
}

export class MagicLinkAuthProvider implements IAuthProvider {
  public readonly name = 'magic-link';
  private linkTTL: number;
  
  constructor(private config: MagicLinkConfig) {
    this.linkTTL = config.linkTTL || 15; // 15 minutes default
  }

  async getLoginUrl(state?: string): Promise<string> {
    // Magic link provider doesn't use redirect URLs
    return '/auth/magic-link/request';
  }

  async authenticate(token: string): Promise<AuthUser> {
    try {
      // Verify the magic link token
      const payload = jwt.verify(token, this.config.jwtSecret) as any;
      
      if (payload.type !== 'magic-link') {
        throw new Error('Invalid token type');
      }

      const { email, name } = payload;

      // Get or create user
      let user = await this.config.userStore.getUserByEmail(email);
      
      if (!user) {
        // Create new user if they don't exist
        user = await this.config.userStore.createUser({
          email,
          name,
          verified: true // Magic link implies email verification
        });
      } else {
        // Update last login
        user = await this.config.userStore.updateUser(user.id, {
          lastLogin: new Date(),
          verified: true
        });
      }

      return {
        id: `magic-link-${user.id}`,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private',
          name: 'Global Users'
        },
        provider: 'magic-link',
        metadata: {
          verified: user.verified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Magic link authentication failed:', error);
      throw new Error('Invalid or expired magic link');
    }
  }

  async sendMagicLink(request: MagicLinkRequest): Promise<void> {
    const { email, name } = request;

    try {
      // Generate magic link token
      const token = jwt.sign(
        {
          type: 'magic-link',
          email,
          name,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (this.linkTTL * 60)
        },
        this.config.jwtSecret
      );

      // Create magic link URL
      const magicLink = `${this.config.baseUrl}/auth/magic-link/verify?token=${token}`;

      // Send magic link email
      await this.config.emailService.sendMagicLink(email, magicLink);
    } catch (error) {
      console.error('Magic link send failed:', error);
      throw new Error('Failed to send magic link');
    }
  }

  async verifyMagicLink(token: string): Promise<boolean> {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as any;
      return payload.type === 'magic-link';
    } catch (error) {
      return false;
    }
  }
}