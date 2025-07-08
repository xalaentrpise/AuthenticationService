# @xala-technologies/authentication

Norwegian-compliant authentication package with ID-porten, BankID, Feide integration. Built for Norwegian public sector compliance, GDPR adherence, and seamless Supabase integration.

## Features

- 🇳🇴 **Norwegian Providers**: Complete integration with ID-porten, BankID, Feide, and MinID
- 🔐 **RBAC Permissions**: Role-based access control with hierarchical permissions
- 📋 **Compliance Ready**: Built-in GDPR, NSM, and Digdir compliance
- 🔑 **JWT Management**: Secure token generation and validation
- 🛡️ **Middleware**: Ready-to-use Express/Fastify middleware
- 🧪 **Testing**: 100% test coverage with mock providers
- 🔒 **Security**: NSM-compliant ChaCha20-Poly1305 encryption
- 📊 **Audit Trails**: Complete compliance logging and reporting

## Installation

```bash
npm install @xala-technologies/authentication
```

## Quick Start

### Basic Authentication Setup

```typescript
import { AuthService, IDPortenProvider } from '@xala-technologies/authentication';

const authService = new AuthService({
  providers: [
    new IDPortenProvider({
      clientId: process.env.IDPORTEN_CLIENT_ID!,
      clientSecret: process.env.IDPORTEN_CLIENT_SECRET!,
      redirectUri: 'https://your-app.no/auth/callback',
      environment: 'production'
    })
  ],
  jwt: {
    secret: process.env.JWT_SECRET!,
    algorithm: 'RS256',
    expiresIn: '1h'
  }
});

// Generate login URL
const loginUrl = await authService.getLoginUrl('idporten');
// Redirect user to loginUrl

// Handle authentication callback
const tokens = await authService.handleCallback('idporten', authCode);
```

### Express Middleware Integration

```typescript
import { withAuthContext, requirePermission } from '@xala-technologies/authentication';

// Apply authentication middleware
app.use(withAuthContext({
  jwtSecret: process.env.JWT_SECRET!,
  skipPaths: ['/health', '/login']
}));

// Protected route with permission check
app.get('/admin/users', 
  requirePermission('users:read'),
  (req, res) => {
    const { user, permissions, tenant } = req.authContext;
    // Access authenticated user context
    res.json({ user, permissions });
  }
);
```

## Authentication Providers

### ID-porten (Norwegian National Identity)

```typescript
import { IDPortenProvider } from '@xala-technologies/authentication';

const idPortenProvider = new IDPortenProvider({
  clientId: process.env.IDPORTEN_CLIENT_ID!,
  clientSecret: process.env.IDPORTEN_CLIENT_SECRET!,
  redirectUri: 'https://your-app.no/auth/callback',
  environment: 'production', // or 'test'
  locale: 'nb' // Norwegian Bokmål
});
```

### BankID (Norwegian Banking Identity)

```typescript
import { BankIDProvider } from '@xala-technologies/authentication';

const bankIdProvider = new BankIDProvider({
  clientId: process.env.BANKID_CLIENT_ID!,
  clientSecret: process.env.BANKID_CLIENT_SECRET!,
  redirectUri: 'https://your-app.no/auth/callback',
  environment: 'production',
  merchantName: 'Your Company Name'
});
```

### Feide (Norwegian Educational Federation)

```typescript
import { FeideProvider } from '@xala-technologies/authentication';

const feideProvider = new FeideProvider({
  clientId: process.env.FEIDE_CLIENT_ID!,
  clientSecret: process.env.FEIDE_CLIENT_SECRET!,
  redirectUri: 'https://your-app.no/auth/callback',
  realm: 'uio.no', // Optional: specific institution
  organization: 'fc:org:uio.no' // Optional: organization context
});
```

### Development Provider (Testing)

```typescript
import { DevAuthProvider } from '@xala-technologies/authentication';

const devProvider = new DevAuthProvider({
  users: [
    { 
      id: '1', 
      name: 'Test Bruker', 
      email: 'test@kommune.no', 
      roles: ['admin', 'user'] 
    },
    { 
      id: '2', 
      name: 'Standard Bruker', 
      email: 'bruker@kommune.no', 
      roles: ['user'] 
    }
  ]
});
```

## Role-Based Access Control (RBAC)

### Defining Roles and Permissions

```typescript
import { AuthService, RBACConfig } from '@xala-technologies/authentication';

const rbacConfig: RBACConfig = {
  hierarchyEnabled: true,
  roles: [
    {
      name: 'citizen',
      permissions: ['profile:read', 'services:use'],
      description: 'Basic citizen access'
    },
    {
      name: 'employee',
      permissions: ['admin:read', 'reports:generate'],
      inherits: ['citizen'], // Inherits citizen permissions
      description: 'Municipal employee'
    },
    {
      name: 'admin',
      permissions: ['*:*'], // Wildcard - all permissions
      inherits: ['employee'],
      description: 'System administrator'
    }
  ],
  permissions: [
    {
      name: 'profile:read',
      resource: 'profile',
      action: 'read',
      description: 'Read user profile'
    },
    {
      name: 'admin:read',
      resource: 'admin',
      action: 'read',
      description: 'Access admin panel'
    }
  ]
};

const authService = new AuthService({
  providers: [/* ... */],
  jwt: {/* ... */},
  rbac: rbacConfig
});
```

### Permission Checking

```typescript
// In middleware
app.get('/admin', requirePermission('admin:read'), (req, res) => {
  // Only users with admin:read permission can access
});

// Programmatic checking
const hasPermission = await req.authContext.checkPermission('users:delete');
if (hasPermission) {
  // Perform action
}

// Context-based permissions (municipal scope)
const canAccess = await req.authContext.checkPermission('documents:read', {
  municipalityCode: '0301' // Oslo
});
```

## Compliance & Security

### GDPR Compliance

```typescript
import { ComplianceLogger, AuditTrail } from '@xala-technologies/authentication';

const complianceConfig = {
  gdprEnabled: true,
  auditLogging: true,
  encryptionKey: process.env.ENCRYPTION_KEY!,
  dataMinimization: true,
  retentionPeriod: '7 years'
};

const authService = new AuthService({
  providers: [/* ... */],
  jwt: {/* ... */},
  compliance: complianceConfig
});

// Export user data (GDPR Article 20)
const auditTrail = new AuditTrail(complianceLogger);
const userData = await auditTrail.exportUserData('user-id-123', {
  format: 'json',
  includeMetadata: true
});

// Delete user data (GDPR Article 17)
await complianceLogger.deleteUserData('user-id-123');
```

### Audit Reporting

```typescript
// Generate compliance report
const report = await auditTrail.generateReport({
  period: { 
    start: '2024-01-01', 
    end: '2024-12-31' 
  },
  format: 'pdf',
  language: 'nb-NO'
});

// Validate compliance status
const compliance = await auditTrail.validateCompliance();
console.log('GDPR Compliant:', compliance.gdprCompliant);
console.log('NSM Compliant:', compliance.nsmCompliant);
```

## Advanced Configuration

### JWT Configuration

```typescript
const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  algorithm: 'RS256' as const, // or 'HS256', 'ES256'
  issuer: 'https://your-app.no',
  audience: 'your-app-users',
  accessTokenTTL: '15m',
  refreshTokenTTL: '7d'
};
```

### Session Configuration

```typescript
const sessionConfig = {
  name: 'session_token',
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true
};
```

### Multi-Provider Setup

```typescript
const authService = new AuthService({
  providers: [
    new IDPortenProvider({/* ID-porten config */}),
    new BankIDProvider({/* BankID config */}),
    new FeideProvider({/* Feide config */}),
    ...(process.env.NODE_ENV === 'development' ? [
      new DevAuthProvider({/* dev config */})
    ] : [])
  ],
  jwt: jwtConfig,
  rbac: rbacConfig,
  compliance: complianceConfig
});
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Mock Providers

```typescript
import { DevAuthProvider } from '@xala-technologies/authentication';

// Use in tests
const mockProvider = new DevAuthProvider({
  users: [
    { id: 'test-1', name: 'Test User', email: 'test@example.com', roles: ['user'] }
  ]
});

const authService = new AuthService({
  providers: [mockProvider],
  jwt: { secret: 'test-secret', algorithm: 'HS256' }
});
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# JWT Configuration
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_ALGORITHM=RS256

# ID-porten
IDPORTEN_CLIENT_ID=your-idporten-client-id
IDPORTEN_CLIENT_SECRET=your-idporten-client-secret
IDPORTEN_REDIRECT_URI=https://your-app.no/auth/callback

# BankID
BANKID_CLIENT_ID=your-bankid-client-id
BANKID_CLIENT_SECRET=your-bankid-client-secret

# Feide
FEIDE_CLIENT_ID=your-feide-client-id
FEIDE_CLIENT_SECRET=your-feide-client-secret

# Compliance
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
AUDIT_RETENTION_PERIOD=7 years
```

## API Reference

### AuthService

- `getLoginUrl(provider: string, state?: string): Promise<string>`
- `handleCallback(provider: string, code: string, state?: string): Promise<AuthTokens>`
- `validateToken(token: string): Promise<AuthUser | null>`
- `refreshToken(refreshToken: string): Promise<AuthTokens>`
- `logout(userId: string): Promise<void>`

### Middleware

- `withAuthContext(config: AuthContextConfig): RequestHandler`
- `requirePermission(permission: string, context?: PermissionContext): RequestHandler`

### Types

All TypeScript types are exported for use in your application:

```typescript
import type { 
  AuthUser, 
  AuthTokens, 
  AuthProvider,
  RBACConfig,
  ComplianceConfig 
} from '@xala-technologies/authentication';
```

## Error Handling

```typescript
try {
  const tokens = await authService.handleCallback('idporten', code);
} catch (error) {
  if (error.message.includes('Invalid authorization code')) {
    // Handle invalid code
  } else if (error.message.includes('Provider not found')) {
    // Handle unknown provider
  } else {
    // Handle other errors
  }
}
```

## Migration Guide

### From v1.x to v2.x

Major breaking changes in v2.0:

1. **Provider Configuration**: Updated configuration format
2. **JWT Handling**: New JWT manager with enhanced security
3. **RBAC System**: Complete rewrite with role inheritance
4. **Compliance**: Enhanced GDPR and NSM compliance features

See [CHANGELOG.md](./CHANGELOG.md) for detailed migration instructions.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -am 'Add feature'`
5. Push to branch: `git push origin feature/my-feature`
6. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- 📚 [Documentation](https://docs.xala.no/authentication)
- 🐛 [Issue Tracker](https://github.com/xala-technologies/authentication/issues)
- 💬 [Discussions](https://github.com/xala-technologies/authentication/discussions)
- 📧 [Email Support](mailto:support@xala.no)

## Related Packages

- `@xala-technologies/security-compliance` - Enhanced security and compliance tools
- `@xala-technologies/norwegian-services` - Digdir and Altinn integrations
- `@xala-technologies/foundation` - Core utilities and logging

---

Built with ❤️ for the Norwegian public sector by [Xala Technologies](https://xala.no)
