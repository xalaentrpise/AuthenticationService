import axios from 'axios';
import { AuthProvider, AuthUser, BankIDConfig } from '../types';

export class BankIDProvider implements AuthProvider {
  name = 'bankid';
  private baseUrl: string;

  constructor(private config: BankIDConfig) {
    this.baseUrl = config.environment === 'production'
      ? 'https://auth.bankid.no'
      : 'https://auth.test.bankid.no';
  }

  async getLoginUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes?.join(' ') || 'openid profile national_identity_number',
      state: state || '',
      ...(this.config.merchantName && { merchant_name: this.config.merchantName })
    });

    return `${this.baseUrl}/auth/realms/bankid/protocol/openid-connect/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthUser> {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      `${this.baseUrl}/auth/realms/bankid/protocol/openid-connect/token`,
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
    const userResponse = await axios.get(
      `${this.baseUrl}/auth/realms/bankid/protocol/openid-connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const userInfo = userResponse.data;

    return {
      id: userInfo.sub,
      name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
      email: userInfo.email,
      roles: ['user'],
      permissions: [],
      tenant: {
        id: 'bankid',
        type: 'private',
        name: 'BankID User'
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
      const userResponse = await axios.get(
        `${this.baseUrl}/auth/realms/bankid/protocol/openid-connect/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const userInfo = userResponse.data;
      
      return {
        id: userInfo.sub,
        name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
        email: userInfo.email,
        roles: ['user'],
        permissions: []
      };
    } catch (error) {
      return null;
    }
  }
}
