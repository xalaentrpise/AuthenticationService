import axios from 'axios';
import { AuthProvider, AuthUser, FeideConfig } from '../types';

export class FeideProvider implements AuthProvider {
  name = 'feide';
  private baseUrl = 'https://auth.feide.no';

  constructor(private config: FeideConfig) {}

  async getLoginUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes?.join(' ') || 'userinfo-name userinfo-email userinfo-photo',
      state: state || '',
      ...(this.config.realm && { feideid: this.config.realm }),
      ...(this.config.organization && { orgid: this.config.organization })
    });

    return `${this.baseUrl}/oauth/authorization?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthUser> {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      `${this.baseUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get(`${this.baseUrl}/openidconnect/userinfo`, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const userInfo = userResponse.data;

    return {
      id: userInfo.user?.userid || userInfo.sub,
      name: userInfo.user?.name || userInfo.name,
      email: userInfo.user?.email || userInfo.email,
      roles: ['user', 'student'], // Feide typically for educational institutions
      permissions: [],
      tenant: {
        id: 'feide',
        type: 'private',
        name: 'Feide Educational Institution'
      },
      gdprConsent: {
        given: true,
        timestamp: new Date(),
        version: '1.0'
      }
    };
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const userResponse = await axios.get(`${this.baseUrl}/openidconnect/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const userInfo = userResponse.data;
      
      return {
        id: userInfo.user?.userid || userInfo.sub,
        name: userInfo.user?.name || userInfo.name,
        email: userInfo.user?.email || userInfo.email,
        roles: ['user', 'student'],
        permissions: []
      };
    } catch (error) {
      return null;
    }
  }
}
