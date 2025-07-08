import { AuthUser, RBACConfig, RoleDefinition, PermissionDefinition } from '../types';

export class RBACService {
  private roles: Map<string, RoleDefinition>;
  private permissions: Map<string, PermissionDefinition>;

  constructor(private config: RBACConfig) {
    this.roles = new Map();
    this.permissions = new Map();

    config.roles.forEach(role => {
      this.roles.set(role.name, role);
    });

    config.permissions.forEach(permission => {
      this.permissions.set(permission.name, permission);
    });
  }

  async getUserPermissions(user: AuthUser): Promise<string[]> {
    const permissions = new Set<string>();

    // Collect permissions from all user roles
    for (const roleName of user.roles) {
      const rolePermissions = await this.getRolePermissions(roleName);
      rolePermissions.forEach(permission => permissions.add(permission));
    }

    return Array.from(permissions);
  }

  async getRolePermissions(roleName: string): Promise<string[]> {
    const role = this.roles.get(roleName);
    if (!role) {
      return [];
    }

    const permissions = new Set<string>(role.permissions);

    // Handle role inheritance
    if (this.config.hierarchyEnabled && role.inherits) {
      for (const inheritedRole of role.inherits) {
        const inheritedPermissions = await this.getRolePermissions(inheritedRole);
        inheritedPermissions.forEach(permission => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  }

  async checkPermission(
    user: AuthUser, 
    permission: string, 
    context?: any
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(user);
    
    // Direct permission check
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Wildcard permission check (e.g., 'admin:*' matches 'admin:read')
    const wildcardPermissions = userPermissions.filter(p => p.endsWith(':*'));
    for (const wildcardPerm of wildcardPermissions) {
      const prefix = wildcardPerm.slice(0, -1); // Remove '*'
      if (permission.startsWith(prefix)) {
        return true;
      }
    }

    // Context-based permission checks
    if (context) {
      return this.checkContextualPermission(user, permission, context);
    }

    return false;
  }

  private async checkContextualPermission(
    user: AuthUser,
    permission: string,
    context: any
  ): Promise<boolean> {
    // Municipal-specific permissions
    if (user.tenant?.type === 'municipality' && context.municipalityCode) {
      return user.tenant.municipalityCode === context.municipalityCode;
    }

    // Department-specific permissions
    if (context.department && user.tenant) {
      // Check if user belongs to the same department/organization
      return true; // Simplified - implement based on your domain logic
    }

    return false;
  }

  getRole(roleName: string): RoleDefinition | undefined {
    return this.roles.get(roleName);
  }

  getPermission(permissionName: string): PermissionDefinition | undefined {
    return this.permissions.get(permissionName);
  }

  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissions.values());
  }
}

export class PermissionChecker {
  constructor(private rbacService: RBACService) {}

  async can(user: AuthUser, permission: string, context?: any): Promise<boolean> {
    return this.rbacService.checkPermission(user, permission, context);
  }

  async cannot(user: AuthUser, permission: string, context?: any): Promise<boolean> {
    return !(await this.can(user, permission, context));
  }

  async hasRole(user: AuthUser, roleName: string): Promise<boolean> {
    return user.roles.includes(roleName);
  }

  async hasAnyRole(user: AuthUser, roleNames: string[]): Promise<boolean> {
    return roleNames.some(role => user.roles.includes(role));
  }

  async hasAllRoles(user: AuthUser, roleNames: string[]): Promise<boolean> {
    return roleNames.every(role => user.roles.includes(role));
  }
}
