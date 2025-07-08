import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface SupabaseAuthConfig {
  supabaseUrl: string;
  supabaseKey: string;
  jwtSecret: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  phone?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at: string;
  last_sign_in_at?: string;
}

export class SupabaseAuthProvider implements IAuthProvider {
  public readonly name = 'supabase';
  
  constructor(private config: SupabaseAuthConfig) {}

  async getLoginUrl(state?: string): Promise<string> {
    // Supabase auth is typically handled client-side
    return '/auth/supabase/login';
  }

  async authenticate(supabaseJWT: string): Promise<AuthUser> {
    try {
      // In a real implementation, you would:
      // 1. Verify the Supabase JWT token
      // 2. Extract user information from the token
      // 3. Optionally fetch additional user data from Supabase

      // For now, we'll decode the JWT to extract user info
      const payload = this.decodeJWT(supabaseJWT);
      
      if (!payload.sub || !payload.email) {
        throw new Error('Invalid Supabase token');
      }

      return {
        id: `supabase-${payload.sub}`,
        name: payload.user_metadata?.name || payload.email.split('@')[0],
        email: payload.email,
        roles: this.extractRoles(payload),
        permissions: this.extractPermissions(payload),
        tenant: this.extractTenant(payload),
        provider: 'supabase',
        metadata: {
          supabaseId: payload.sub,
          user_metadata: payload.user_metadata,
          app_metadata: payload.app_metadata,
          phone: payload.phone,
          email_verified: payload.email_verified,
          phone_verified: payload.phone_verified
        }
      };
    } catch (error) {
      console.error('Supabase authentication failed:', error);
      throw new Error('Supabase authentication failed');
    }
  }

  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  private extractRoles(payload: any): string[] {
    // Extract roles from app_metadata or user_metadata
    return payload.app_metadata?.roles || 
           payload.user_metadata?.roles || 
           ['user']; // Default role
  }

  private extractPermissions(payload: any): string[] {
    // Extract permissions from app_metadata or user_metadata
    return payload.app_metadata?.permissions || 
           payload.user_metadata?.permissions || 
           ['profile:read', 'services:use']; // Default permissions
  }

  private extractTenant(payload: any): any {
    // Extract tenant information from metadata
    const tenantInfo = payload.app_metadata?.tenant || payload.user_metadata?.tenant;
    
    if (tenantInfo) {
      return tenantInfo;
    }

    // Default tenant
    return {
      id: 'global',
      type: 'private',
      name: 'Global Users'
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // In a real implementation, you would call Supabase's refresh endpoint
      // For now, we'll throw an error to indicate this needs to be implemented
      throw new Error('Supabase token refresh not implemented');
    } catch (error) {
      console.error('Supabase token refresh failed:', error);
      throw new Error('Failed to refresh Supabase token');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // In a real implementation, you would call Supabase's logout endpoint
      // For now, this is a no-op
      console.log(`Logging out Supabase user: ${userId}`);
    } catch (error) {
      console.error('Supabase logout failed:', error);
      throw new Error('Failed to logout from Supabase');
    }
  }
}