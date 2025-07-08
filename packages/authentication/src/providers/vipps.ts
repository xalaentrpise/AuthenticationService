import axios from 'axios';
import { IAuthProvider } from '../types';
import { AuthUser } from '../types';

export interface VippsAuthConfig {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  redirectUri: string;
  environment: 'test' | 'production';
  merchantSerialNumber?: string;
}

export class VippsAuthProvider implements IAuthProvider {
  public readonly name = 'vipps';
  private baseUrl: string;
  
  constructor(private config: VippsAuthConfig) {
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.vipps.no' 
      : 'https://apitest.vipps.no';
  }

  async getLoginUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: 'openid name phoneNumber',
      redirect_uri: this.config.redirectUri,
      ...(state && { state })
    });

    return `${this.baseUrl}/access-management-1.0/access/oauth2/auth?${params.toString()}`;
  }

  async authenticate(authCode: string): Promise<AuthUser> {
    try {
      // Get access token first
      const accessToken = await this.getAccessToken();

      // Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        `${this.baseUrl}/access-management-1.0/access/oauth2/token`,
        {
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: authCode,
          redirect_uri: this.config.redirectUri
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`,
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
          }
        }
      );

      const { access_token: userAccessToken } = tokenResponse.data;

      // Get user information
      const userResponse = await axios.get(
        `${this.baseUrl}/vipps-userinfo-api/userinfo`,
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
          }
        }
      );

      const vippsUser = userResponse.data;

      return {
        id: `vipps-${vippsUser.sub || vippsUser.phone_number}`,
        name: vippsUser.name || `Vipps User`,
        email: vippsUser.email || `${vippsUser.phone_number}@vipps.local`,
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'norway',
          type: 'private',
          name: 'Norway Users'
        },
        provider: 'vipps',
        metadata: {
          vippsId: vippsUser.sub,
          phoneNumber: vippsUser.phone_number,
          given_name: vippsUser.given_name,
          family_name: vippsUser.family_name,
          birthdate: vippsUser.birthdate,
          address: vippsUser.address
        }
      };
    } catch (error) {
      console.error('Vipps authentication failed:', error);
      throw new Error('Vipps authentication failed');
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/accesstoken/get`,
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          resource: 'https://api.vipps.no',
          grant_type: 'client_credentials'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get Vipps access token:', error);
      throw new Error('Failed to authenticate with Vipps');
    }
  }
}