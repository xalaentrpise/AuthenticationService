import { EventEmitter } from 'events';
import { JWTManager } from './jwt-manager';
import { RBACService } from '../permissions/rbac';
import { ComplianceLogger } from '../compliance/logger';
import {
  AuthServiceConfig,
  AuthProvider,
  AuthUser,
  AuthTokens,
  AuditEvent
} from '../types';

export class AuthService extends EventEmitter {
  private providers: Map<string, AuthProvider>;
  private jwtManager: JWTManager;
  private rbacService?: RBACService;
  private complianceLogger?: ComplianceLogger;

  constructor(private config: AuthServiceConfig) {
    super();
    
    this.providers = new Map();
    config.providers.forEach(provider => {
      this.providers.set(provider.name, provider);
    });

    this.jwtManager = new JWTManager(config.jwt);

    if (config.rbac) {
      this.rbacService = new RBACService(config.rbac);
    }

    if (config.compliance) {
      this.complianceLogger = new ComplianceLogger(config.compliance);
    }
  }

  async getLoginUrl(providerName: string, state?: string): Promise<string> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    return provider.getLoginUrl(state);
  }

  async handleCallback(
    providerName: string,
    code: string,
    state?: string,
    request?: any
  ): Promise<AuthTokens> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    try {
      const user = await provider.handleCallback(code, state);
      
      // Enrich user with RBAC permissions
      if (this.rbacService) {
        user.permissions = await this.rbacService.getUserPermissions(user);
      }

      // Generate JWT tokens
      const tokens = await this.jwtManager.generateTokens(user);

      // Log successful authentication
      const auditEvent: AuditEvent = {
        type: 'LOGIN_SUCCESS',
        userId: user.id,
        provider: providerName,
        ipAddress: request?.ip,
        userAgent: request?.get?.('User-Agent'),
        timestamp: new Date(),
        gdprConsent: user.gdprConsent?.given,
        dataProcessingBasis: 'legitimate_interest'
      };

      if (this.complianceLogger) {
        await this.complianceLogger.logAuthEvent(auditEvent);
      }

      this.emit('login', { user, provider: providerName, request });

      return tokens;
    } catch (error) {
      // Log failed authentication
      const auditEvent: AuditEvent = {
        type: 'LOGIN_FAILURE',
        provider: providerName,
        ipAddress: request?.ip,
        userAgent: request?.get?.('User-Agent'),
        timestamp: new Date(),
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };

      if (this.complianceLogger) {
        await this.complianceLogger.logAuthEvent(auditEvent);
      }

      throw error;
    }
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwtManager.verifyToken(token);
      return payload as AuthUser;
    } catch (error) {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const user = await this.jwtManager.verifyRefreshToken(refreshToken);
      
      // Re-fetch user permissions
      if (this.rbacService) {
        user.permissions = await this.rbacService.getUserPermissions(user);
      }

      const tokens = await this.jwtManager.generateTokens(user);

      // Log token refresh
      const auditEvent: AuditEvent = {
        type: 'TOKEN_REFRESH',
        userId: user.id,
        timestamp: new Date()
      };

      if (this.complianceLogger) {
        await this.complianceLogger.logAuthEvent(auditEvent);
      }

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string, request?: any): Promise<void> {
    // Log logout event
    const auditEvent: AuditEvent = {
      type: 'LOGOUT',
      userId,
      ipAddress: request?.ip,
      userAgent: request?.get?.('User-Agent'),
      timestamp: new Date()
    };

    if (this.complianceLogger) {
      await this.complianceLogger.logAuthEvent(auditEvent);
    }

    this.emit('logout', { userId, request });
  }

  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}
