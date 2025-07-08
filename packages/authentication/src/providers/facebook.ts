import axios from 'axios';
import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface FacebookOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export class FacebookOAuthProvider implements IAuthProvider {
  public readonly name = 'facebook';
  
  constructor(private config: FacebookOAuthConfig) {}

  async getLoginUrl(state?: string): Promise<string> {
    const scopes = this.config.scopes || ['email', 'public_profile'];
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      ...(state && { state })
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  async authenticate(authCode: string): Promise<AuthUser> {
    try {
      // Exchange authorization code for access token
      const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          redirect_uri: this.config.redirectUri,
          code: authCode
        }
      });

      const { access_token } = tokenResponse.data;

      // Get user information
      const userResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          access_token: access_token,
          fields: 'id,name,email,first_name,last_name,picture'
        }
      });

      const facebookUser = userResponse.data;

      return {
        id: `facebook-${facebookUser.id}`,
        name: facebookUser.name,
        email: facebookUser.email,
        roles: ['user'], // Default role for Facebook users
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private',
          name: 'Global Users'
        },
        provider: 'facebook',
        metadata: {
          facebookId: facebookUser.id,
          first_name: facebookUser.first_name,
          last_name: facebookUser.last_name,
          picture: facebookUser.picture?.data?.url
        }
      };
    } catch (error) {
      console.error('Facebook authentication failed:', error);
      throw new Error('Facebook authentication failed');
    }
  }
}