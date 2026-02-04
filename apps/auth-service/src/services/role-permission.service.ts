import { Injectable } from '@nestjs/common';
import { UserRole, Permission } from '../interfaces/auth.interfaces';

@Injectable()
export class RolePermissionService {
  private readonly rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      // All permissions for admin
      Permission.VIEW_VEHICLES,
      Permission.MANAGE_VEHICLES,
      Permission.VIEW_PARCELS,
      Permission.MANAGE_PARCELS,
      Permission.ASSIGN_PARCELS,
      Permission.VIEW_DECISIONS,
      Permission.OVERRIDE_DECISIONS,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_REPORTS,
      Permission.MANAGE_USERS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.MANAGE_SYSTEM,
      Permission.BYPASS_SLA,
      Permission.MANUAL_CUSTODY,
    ],
    [UserRole.DISPATCHER]: [
      // Dispatcher permissions
      Permission.VIEW_VEHICLES,
      Permission.MANAGE_VEHICLES,
      Permission.VIEW_PARCELS,
      Permission.MANAGE_PARCELS,
      Permission.ASSIGN_PARCELS,
      Permission.VIEW_DECISIONS,
      Permission.OVERRIDE_DECISIONS,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_REPORTS,
    ],
    [UserRole.DRIVER]: [
      // Driver permissions
      Permission.VIEW_VEHICLES,
      Permission.VIEW_PARCELS,
      Permission.VIEW_DECISIONS,
    ],
  };

  getPermissionsForRole(role: UserRole): Permission[] {
    return this.rolePermissions[role] || [];
  }

  hasPermission(_userRole: UserRole, userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
  }

  hasAnyPermission(_userRole: UserRole, userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  hasAllPermissions(_userRole: UserRole, userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  canAccessResource(userRole: UserRole, userPermissions: Permission[], resource: string, action: string): boolean {
    // Define resource-action to permission mapping
    const resourcePermissionMap: Record<string, Record<string, Permission>> = {
      vehicles: {
        read: Permission.VIEW_VEHICLES,
        write: Permission.MANAGE_VEHICLES,
      },
      parcels: {
        read: Permission.VIEW_PARCELS,
        write: Permission.MANAGE_PARCELS,
        assign: Permission.ASSIGN_PARCELS,
      },
      decisions: {
        read: Permission.VIEW_DECISIONS,
        override: Permission.OVERRIDE_DECISIONS,
      },
      analytics: {
        read: Permission.VIEW_ANALYTICS,
        export: Permission.EXPORT_REPORTS,
      },
      users: {
        read: Permission.MANAGE_USERS,
        write: Permission.MANAGE_USERS,
      },
      audit: {
        read: Permission.VIEW_AUDIT_LOGS,
      },
      system: {
        manage: Permission.MANAGE_SYSTEM,
      },
    };

    const resourceActions = resourcePermissionMap[resource];
    if (!resourceActions) {
      return false;
    }

    const requiredPermission = resourceActions[action];
    if (!requiredPermission) {
      return false;
    }

    return this.hasPermission(userRole, userPermissions, requiredPermission);
  }

  isSensitiveOperation(permission: Permission): boolean {
    const sensitivePermissions = [
      Permission.BYPASS_SLA,
      Permission.MANUAL_CUSTODY,
      Permission.MANAGE_SYSTEM,
      Permission.MANAGE_USERS,
      Permission.OVERRIDE_DECISIONS,
    ];

    return sensitivePermissions.includes(permission);
  }

  getDefaultPermissionsForRole(role: UserRole): Permission[] {
    return [...this.rolePermissions[role]];
  }

  validateRolePermissions(role: UserRole, permissions: Permission[]): { valid: boolean; invalidPermissions: Permission[] } {
    const allowedPermissions = this.rolePermissions[role];
    const invalidPermissions = permissions.filter(permission => !allowedPermissions.includes(permission));

    return {
      valid: invalidPermissions.length === 0,
      invalidPermissions,
    };
  }
}