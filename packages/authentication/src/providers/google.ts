import axios from 'axios';
import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export class GoogleOAuthProvider implements IAuthProvider {
  public readonly name = 'google';
  
  constructor(private config: GoogleOAuthConfig) {}

  async getLoginUrl(state?: string): Promise<string> {
    const scopes = this.config.scopes || ['openid', 'profile', 'email'];
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async authenticate(authCode: string): Promise<AuthUser> {
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri
      });

      const { access_token } = tokenResponse.data;

      // Get user information
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });

      const googleUser = userResponse.data;

      return {
        id: `google-${googleUser.id}`,
        name: googleUser.name || `${googleUser.given_name} ${googleUser.family_name}`.trim(),
        email: googleUser.email,
        roles: ['user'], // Default role for Google users
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private',
          name: 'Global Users'
        },
        provider: 'google',
        metadata: {
          googleId: googleUser.id,
          picture: googleUser.picture,
          verified_email: googleUser.verified_email,
          locale: googleUser.locale
        }
      };
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw new Error('Google authentication failed');
    }
  }
}