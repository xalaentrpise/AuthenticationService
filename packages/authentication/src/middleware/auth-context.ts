import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../core/auth-service';
import { AuthRequest, AuthContext, PermissionContext } from '../types';

interface AuthContextConfig {
  jwtSecret: string;
  skipPaths?: string[];
  authService?: AuthService;
}

export function withAuthContext(config: AuthContextConfig) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Skip authentication for certain paths
    if (config.skipPaths?.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      const token = extractToken(req);
      
      if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
      }

      // TODO: Use actual auth service for token validation
      // For now, we'll mock the user context
      const user = {
        id: 'mock-user',
        name: 'Mock User',
        email: 'user@example.com',
        roles: ['user'],
        permissions: ['read:profile'],
        tenant: {
          id: 'mock-tenant',
          type: 'municipality' as const,
          municipalityCode: '0301',
          name: 'Mock Municipality'
        }
      };

      const authContext: AuthContext = {
        user,
        permissions: user.permissions,
        tenant: user.tenant,
        checkPermission: async (permission: string, context?: PermissionContext) => {
          // TODO: Implement proper permission checking
          return user.permissions.includes(permission);
        }
      };

      req.authContext = authContext;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid authentication token' });
    }
  };
}

export function requirePermission(permission: string, context?: PermissionContext) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = await req.authContext.checkPermission(permission, context);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission 
      });
    }

    next();
  };
}

function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookies
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}
