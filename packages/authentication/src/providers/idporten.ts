import axios from 'axios';
import { AuthProvider, AuthUser, IDPortenConfig } from '../types';

export class IDPortenProvider implements AuthProvider {
  name = 'idporten';
  private wellKnownUrl: string;
  private discoveryData: any;

  constructor(private config: IDPortenConfig) {
    this.wellKnownUrl = config.wellKnownUrl || 
      (config.environment === 'production' 
        ? 'https://oidc.difi.no/idporten-oidc-provider/.well-known/openid_configuration'
        : 'https://oidc-ver2.difi.no/idporten-oidc-provider/.well-known/openid_configuration'
      );
  }

  private async getDiscoveryData(): Promise<any> {
    if (!this.discoveryData) {
      const response = await axios.get(this.wellKnownUrl);
      this.discoveryData = response.data;
    }
    return this.discoveryData;
  }

  async getLoginUrl(state?: string): Promise<string> {
    const discovery = await this.getDiscoveryData();
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes?.join(' ') || 'openid profile',
      state: state || '',
      ...(this.config.locale && { ui_locales: this.config.locale })
    });

    return `${discovery.authorization_endpoint}?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthUser> {
    const discovery = await this.getDiscoveryData();

    // Exchange code for tokens
    const tokenResponse = await axios.post(discovery.token_endpoint, 
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
    const userResponse = await axios.get(discovery.userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const userInfo = userResponse.data;

    return {
      id: userInfo.sub,
      name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
      email: userInfo.email,
      roles: ['user'], // Default role, can be enhanced
      permissions: [],
      tenant: {
        id: 'idporten',
        type: 'state',
        name: 'ID-porten User'
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
      const discovery = await this.getDiscoveryData();
      const userResponse = await axios.get(discovery.userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

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
