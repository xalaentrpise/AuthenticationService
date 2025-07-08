import { Request } from 'express';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenant?: {
    id: string;
    type: 'municipality' | 'county' | 'state' | 'private';
    municipalityCode?: string;
    name: string;
  };
  gdprConsent?: {
    given: boolean;
    timestamp: Date;
    version: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthProvider {
  name: string;
  getLoginUrl(state?: string): Promise<string>;
  handleCallback(code: string, state?: string): Promise<AuthUser>;
  refreshToken?(refreshToken: string): Promise<AuthTokens>;
  validateToken(token: string): Promise<AuthUser | null>;
}

export interface JWTConfig {
  secret: string;
  algorithm?: 'HS256' | 'RS256' | 'ES256';
  issuer?: string;
  audience?: string;
  accessTokenTTL?: string;
  refreshTokenTTL?: string;
}

export interface SessionConfig {
  name: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  httpOnly?: boolean;
}

export interface AuthServiceConfig {
  providers: AuthProvider[];
  jwt: JWTConfig;
  session?: SessionConfig;
  rbac?: RBACConfig;
  compliance?: ComplianceConfig;
}

export interface RBACConfig {
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
  hierarchyEnabled?: boolean;
}

export interface RoleDefinition {
  name: string;
  permissions: string[];
  inherits?: string[];
  description?: string;
}

export interface PermissionDefinition {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface ComplianceConfig {
  gdprEnabled: boolean;
  auditLogging: boolean;
  encryptionKey?: string;
  retentionPeriod?: string;
  dataMinimization?: boolean;
}

export interface AuthContext {
  user: AuthUser;
  permissions: string[];
  tenant?: AuthUser['tenant'];
  checkPermission: (permission: string, context?: any) => Promise<boolean>;
}

export interface AuthRequest extends Request {
  authContext?: AuthContext;
}

export interface AuditEvent {
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PERMISSION_CHECK' | 'TOKEN_REFRESH';
  userId?: string;
  provider?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  gdprConsent?: boolean;
  dataProcessingBasis?: string;
}

export interface PermissionContext {
  resource?: string;
  scope?: string;
  context?: Record<string, any>;
}

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment?: 'test' | 'production';
  scopes?: string[];
}

export interface IDPortenConfig extends ProviderConfig {
  wellKnownUrl?: string;
  locale?: 'nb' | 'nn' | 'en' | 'se';
}

export interface BankIDConfig extends ProviderConfig {
  merchantName?: string;
  keystore?: string;
  keystorePassword?: string;
}

export interface FeideConfig extends ProviderConfig {
  realm?: string;
  organization?: string;
}

export interface DevAuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface DevAuthConfig {
  users: DevAuthUser[];
  sessionDuration?: number;
}
