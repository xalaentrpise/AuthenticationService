import { AuthProvider, AuthUser, DevAuthConfig } from '../types';

export class DevAuthProvider implements AuthProvider {
  name = 'dev';
  private sessions = new Map<string, AuthUser>();

  constructor(private config: DevAuthConfig) {}

  async getLoginUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      provider: 'dev',
      state: state || ''
    });

    return `/auth/dev/login?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthUser> {
    // In development, 'code' is actually the user ID
    const user = this.config.users.find(u => u.id === code);
    
    if (!user) {
      throw new Error('Invalid development user');
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      permissions: [],
      tenant: {
        id: 'dev',
        type: 'municipality',
        municipalityCode: '0301',
        name: 'Development Municipality'
      },
      gdprConsent: {
        given: true,
        timestamp: new Date(),
        version: '1.0'
      }
    };

    // Store session
    this.sessions.set(user.id, authUser);

    return authUser;
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    // In development, token is the user ID
    return this.sessions.get(token) || null;
  }

  getDevUsers(): Array<{ id: string; name: string; email: string; roles: string[] }> {
    return this.config.users;
  }
}
