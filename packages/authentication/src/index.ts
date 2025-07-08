// Core authentication services
export { AuthService } from './core/auth-service';
export { JWTManager } from './core/jwt-manager';

// Authentication providers
export {
  IDPortenProvider,
  BankIDProvider,
  FeideProvider,
  MinIDProvider,
  DevAuthProvider
} from './providers';

// Middleware
export { withAuthContext, requirePermission } from './middleware/auth-context';

// RBAC and permissions
export { RBACService, PermissionChecker } from './permissions/rbac';

// Compliance and logging
export { ComplianceLogger } from './compliance/logger';
export { AuditTrail } from './compliance/audit-trail';

// Types
export * from './types';

// Utilities
export { EncryptionService } from './utils/encryption';
