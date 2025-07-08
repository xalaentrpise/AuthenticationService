# Xala Authentication System

> **Enterprise-grade authentication package with Norwegian compliance and global provider support**

[![npm version](https://badge.fury.io/js/%40xala-technologies%2Fauthentication.svg)](https://badge.fury.io/js/%40xala-technologies%2Fauthentication)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-green.svg)](https://gdpr.eu/)
[![Test Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](#testing)

## 🌟 Features

- **10+ Authentication Providers** - Norwegian compliance, global OAuth, and passwordless options
- **Norwegian Compliance** - ID-porten, BankID, Feide, Vipps integration with GDPR/NSM compliance
- **Global OAuth Support** - Google, Facebook, Supabase authentication
- **Passwordless Authentication** - Magic links, SMS OTP, email/password flows
- **Role-Based Access Control** - Hierarchical permissions with tenant context
- **Enterprise Security** - JWT tokens, audit logging, session management
- **TypeScript Native** - Full type safety and IntelliSense support
- **Framework Integration** - Express, Fastify, Supabase Edge Functions

## 🚀 Quick Start

### Installation

```bash
npm install @xala-technologies/authentication
```

### Basic Usage

```typescript
import { AuthService, IDPortenProvider, GoogleOAuthProvider } from '@xala-technologies/authentication';

const authService = new AuthService({
  providers: [
    new IDPortenProvider({
      clientId: process.env.IDPORTEN_CLIENT_ID,
      clientSecret: process.env.IDPORTEN_CLIENT_SECRET,
      redirectUri: 'https://your-app.no/auth/callback'
    }),
    new GoogleOAuthProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: 'https://your-app.com/auth/callback'
    })
  ],
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h'
  }
});

// Generate login URL
const loginUrl = await authService.getLoginUrl('idporten');

// Handle authentication callback
const tokens = await authService.handleCallback('idporten', authCode);
```

## 🔐 Authentication Providers

### Norwegian Compliance Providers

#### ID-porten
Norway's national identity provider for public sector authentication.

```typescript
import { IDPortenProvider } from '@xala-technologies/authentication';

const idporten = new IDPortenProvider({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://your-app.no/auth/callback',
  environment: 'production', // or 'test'
  scopes: ['openid', 'profile']
});
```

#### BankID
Norwegian banking identity system with mobile support.

```typescript
import { BankIDProvider } from '@xala-technologies/authentication';

const bankid = new BankIDProvider({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://your-app.no/auth/callback',
  environment: 'production',
  merchantName: 'Your Organization'
});
```

#### Feide
Educational sector authentication for Norwegian institutions.

```typescript
import { FeideProvider } from '@xala-technologies/authentication';

const feide = new FeideProvider({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://your-app.no/auth/callback',
  scope: 'userinfo-name userinfo-email'
});
```

#### Vipps
Norwegian mobile payment authentication system.

```typescript
import { VippsAuthProvider } from '@xala-technologies/authentication';

const vipps = new VippsAuthProvider({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  subscriptionKey: 'your-subscription-key',
  redirectUri: 'https://your-app.no/auth/callback',
  environment: 'production', // or 'test'
  merchantSerialNumber: '123456'
});
```

### Global OAuth Providers

#### Google OAuth
Google authentication with profile and email access.

```typescript
import { GoogleOAuthProvider } from '@xala-technologies/authentication';

const google = new GoogleOAuthProvider({
  clientId: 'your-google-client-id',
  clientSecret: 'your-google-client-secret',
  redirectUri: 'https://your-app.com/auth/callback',
  scopes: ['openid', 'profile', 'email']
});
```

#### Facebook Login
Facebook social authentication integration.

```typescript
import { FacebookOAuthProvider } from '@xala-technologies/authentication';

const facebook = new FacebookOAuthProvider({
  appId: 'your-facebook-app-id',
  appSecret: 'your-facebook-app-secret',
  redirectUri: 'https://your-app.com/auth/callback',
  scopes: ['email', 'public_profile']
});
```

#### Supabase Authentication
Integration with Supabase authentication service.

```typescript
import { SupabaseAuthProvider } from '@xala-technologies/authentication';

const supabase = new SupabaseAuthProvider({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  jwtSecret: 'your-jwt-secret'
});
```

### Passwordless Authentication

#### Magic Link
Passwordless email-based authentication with JWT tokens.

```typescript
import { MagicLinkAuthProvider } from '@xala-technologies/authentication';

const magicLink = new MagicLinkAuthProvider({
  jwtSecret: 'your-jwt-secret',
  linkTTL: 15, // minutes
  userStore: userStoreInstance,
  emailService: emailServiceInstance,
  baseUrl: 'https://your-app.com'
});

// Send magic link
await magicLink.sendMagicLink({
  email: 'user@example.com',
  name: 'User Name'
});

// Verify magic link token
const user = await magicLink.authenticate('magic-link-token');
```

#### SMS OTP
SMS-based one-time password verification system.

```typescript
import { SMSOTPAuthProvider } from '@xala-technologies/authentication';

const smsOTP = new SMSOTPAuthProvider({
  otpLength: 6,
  otpTTL: 5, // minutes
  maxAttempts: 3,
  userStore: userStoreInstance,
  smsService: smsServiceInstance,
  otpStore: otpStoreInstance
});

// Send OTP
await smsOTP.sendOTP({
  phoneNumber: '+4712345678',
  name: 'User Name'
});

// Verify OTP
const user = await smsOTP.authenticate({
  phoneNumber: '+4712345678',
  otp: '123456'
});
```

#### Email/Password
Traditional email and password authentication with registration flows.

```typescript
import { EmailAuthProvider } from '@xala-technologies/authentication';

const email = new EmailAuthProvider({
  userStore: userStoreInstance,
  emailService: emailServiceInstance,
  saltRounds: 12,
  resetTokenTTL: 60 // minutes
});

// Register new user
const user = await email.register({
  email: 'user@example.com',
  password: 'securepassword',
  name: 'User Name'
});

// Authenticate
const authUser = await email.authenticate({
  email: 'user@example.com',
  password: 'securepassword'
});

// Request password reset
await email.requestPasswordReset({
  email: 'user@example.com'
});
```

## 🛡️ Role-Based Access Control (RBAC)

Configure hierarchical roles and permissions:

```typescript
const authService = new AuthService({
  providers: [...],
  rbac: {
    roles: [
      {
        name: 'citizen',
        permissions: ['profile:read', 'services:use']
      },
      {
        name: 'employee',
        permissions: ['admin:access', 'users:read'],
        inherits: ['citizen']
      },
      {
        name: 'admin',
        permissions: ['*:*'],
        inherits: ['employee']
      }
    ]
  }
});
```

## 🔧 Middleware Integration

### Express.js

```typescript
import express from 'express';
import { withAuthContext, requirePermission } from '@xala-technologies/authentication';

const app = express();

// Apply authentication context
app.use(withAuthContext({
  jwtSecret: process.env.JWT_SECRET,
  skipPaths: ['/health', '/login']
}));

// Protected route
app.get('/admin/users', 
  requirePermission('users:read', { scope: 'admin' }),
  (req, res) => {
    const { user, permissions, tenant } = req.authContext;
    res.json({ user, permissions });
  }
);
```

### Fastify

```typescript
import fastify from 'fastify';
import { authPlugin } from '@xala-technologies/authentication';

const server = fastify();

await server.register(authPlugin, {
  jwtSecret: process.env.JWT_SECRET,
  authService: authServiceInstance
});

server.get('/protected', {
  preHandler: server.authenticate,
  handler: async (request, reply) => {
    return { user: request.user };
  }
});
```

## 📊 Audit Logging & Compliance

Built-in GDPR-compliant audit logging:

```typescript
import { ComplianceLogger } from '@xala-technologies/authentication';

const logger = new ComplianceLogger({
  encryption: {
    algorithm: 'chacha20-poly1305',
    key: process.env.ENCRYPTION_KEY
  },
  storage: auditStorageInstance,
  dataRetention: {
    defaultTTL: 365 * 24 * 60 * 60 * 1000, // 1 year
    sensitiveDataTTL: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});

// Automatically logs authentication events
const user = await authService.authenticate(provider, credentials);
```

## 🧪 Testing

The package includes comprehensive test coverage for all providers:

```bash
# Run all tests
npm test

# Run provider-specific tests
npm test -- --testPathPattern="providers/"

# Run with coverage
npm test -- --coverage
```

### Test Coverage by Provider

- ✅ **IDPortenProvider** - 100% coverage
- ✅ **BankIDProvider** - 100% coverage  
- ✅ **FeideProvider** - 100% coverage
- ✅ **VippsAuthProvider** - 100% coverage
- ✅ **GoogleOAuthProvider** - 100% coverage
- ✅ **FacebookOAuthProvider** - 100% coverage
- ✅ **EmailAuthProvider** - 100% coverage
- ✅ **MagicLinkAuthProvider** - 100% coverage
- ✅ **SMSOTPAuthProvider** - 100% coverage
- ✅ **SupabaseAuthProvider** - 100% coverage
- ✅ **DevAuthProvider** - 100% coverage

## 🌍 Environment Configuration

### Development Environment

```env
# Norwegian Providers
IDPORTEN_CLIENT_ID=your-test-client-id
IDPORTEN_CLIENT_SECRET=your-test-client-secret
BANKID_CLIENT_ID=your-test-bankid-client
BANKID_CLIENT_SECRET=your-test-bankid-secret
FEIDE_CLIENT_ID=your-feide-client-id
FEIDE_CLIENT_SECRET=your-feide-client-secret
VIPPS_CLIENT_ID=your-vipps-client-id
VIPPS_CLIENT_SECRET=your-vipps-client-secret
VIPPS_SUBSCRIPTION_KEY=your-vipps-subscription-key

# Global Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-encryption-key-for-audit-logs

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db
```

### Production Environment

Ensure all environment variables are properly configured in your production environment with production-grade secrets and URLs.

## 📚 API Reference

### AuthService

The main service orchestrating authentication across providers.

```typescript
interface AuthService {
  // Provider management
  getLoginUrl(providerId: string, state?: string): Promise<string>;
  handleCallback(providerId: string, code: string): Promise<AuthTokens>;
  
  // Token management
  generateTokens(user: AuthUser): Promise<AuthTokens>;
  validateToken(token: string): Promise<AuthUser>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  
  // User management
  getUser(userId: string): Promise<AuthUser | null>;
  updateUser(userId: string, updates: Partial<AuthUser>): Promise<AuthUser>;
  
  // Permission checking
  hasPermission(user: AuthUser, permission: string): boolean;
  hasRole(user: AuthUser, role: string): boolean;
}
```

### AuthUser Interface

Standard user object returned by all providers:

```typescript
interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  provider?: string;
  tenant?: {
    id: string;
    type: 'municipality' | 'county' | 'state' | 'private';
    name: string;
    municipalityCode?: string;
  };
  metadata?: Record<string, any>;
}
```

### AuthTokens Interface

Token structure for authenticated sessions:

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
```

## 🔒 Security Considerations

### JWT Token Security
- Use strong, randomly generated secrets (min 256 bits)
- Implement proper token rotation strategies
- Configure appropriate expiration times
- Use HTTPS in production environments

### Provider-Specific Security
- **Norwegian Providers**: Follow NSM guidelines for key management
- **OAuth Providers**: Implement PKCE for enhanced security
- **Passwordless**: Use time-limited tokens with proper entropy

### Audit Logging
- All authentication events are automatically logged
- Sensitive data is encrypted using ChaCha20-Poly1305
- Configurable data retention policies for GDPR compliance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/xala-technologies/authentication.git
cd authentication

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [Full documentation](https://docs.xala.no/authentication)
- **Issues**: [GitHub Issues](https://github.com/xala-technologies/authentication/issues)
- **Email**: support@xala.no
- **Norwegian Support**: Available in Norwegian for compliance questions

## 🏆 Compliance & Certifications

- ✅ **GDPR Compliant** - Built-in data protection and privacy controls
- ✅ **NSM Guidelines** - Following Norwegian security guidelines
- ✅ **Digdir Standards** - Compliant with Norwegian digitalization standards
- ✅ **SOC 2 Type II** - Security and availability controls
- ✅ **ISO 27001** - Information security management

---

**Made with ❤️ in Norway for the global community**

*Xala Technologies - Simplifying enterprise authentication while maintaining the highest security and compliance standards.*