import * as jwt from 'jsonwebtoken';
import { JWTConfig, AuthUser, AuthTokens } from '../types';

export class JWTManager {
  constructor(private config: JWTConfig) {}

  async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles || [],
      permissions: user.permissions || [],
      tenant: user.tenant,
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    };

    const refreshPayload = {
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      type: 'refresh'
    };

    const accessToken = jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.accessTokenTTL || '15m'
    });

    const refreshToken = jwt.sign(refreshPayload, this.config.secret, {
      expiresIn: this.config.refreshTokenTTL || '7d'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const payload = jwt.verify(token, this.config.secret) as any;
      
      return {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        tenant: payload.tenant
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async verifyRefreshToken(token: string): Promise<AuthUser> {
    try {
      const payload = jwt.verify(token, this.config.secret) as any;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return {
        id: payload.sub,
        name: '',
        email: '',
        roles: [],
        permissions: []
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async decodeToken(token: string): Promise<any> {
    return jwt.decode(token);
  }
}