import { Test, TestingModule } from '@nestjs/testing';
import { RolePermissionService } from './role-permission.service';
import { UserRole, Permission } from '../interfaces/auth.interfaces';

describe('RolePermissionService', () => {
  let service: RolePermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolePermissionService],
    }).compile();

    service = module.get<RolePermissionService>(RolePermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPermissionsForRole', () => {
    it('should return admin permissions for admin role', () => {
      const permissions = service.getPermissionsForRole(UserRole.ADMIN);
      
      expect(permissions).toContain(Permission.MANAGE_SYSTEM);
      expect(permissions).toContain(Permission.MANAGE_USERS);
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS);
      expect(permissions.length).toBeGreaterThan(10);
    });

    it('should return dispatcher permissions for dispatcher role', () => {
      const permissions = service.getPermissionsForRole(UserRole.DISPATCHER);
      
      expect(permissions).toContain(Permission.VIEW_VEHICLES);
      expect(permissions).toContain(Permission.MANAGE_PARCELS);
      expect(permissions).toContain(Permission.OVERRIDE_DECISIONS);
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM);
    });

    it('should return driver permissions for driver role', () => {
      const permissions = service.getPermissionsForRole(UserRole.DRIVER);
      
      expect(permissions).toContain(Permission.VIEW_VEHICLES);
      expect(permissions).toContain(Permission.VIEW_PARCELS);
      expect(permissions).not.toContain(Permission.MANAGE_PARCELS);
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has required permission', () => {
      const userPermissions = [Permission.VIEW_VEHICLES, Permission.MANAGE_PARCELS];
      
      const result = service.hasPermission(
        UserRole.DISPATCHER,
        userPermissions,
        Permission.VIEW_VEHICLES
      );
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks required permission', () => {
      const userPermissions = [Permission.VIEW_VEHICLES];
      
      const result = service.hasPermission(
        UserRole.DRIVER,
        userPermissions,
        Permission.MANAGE_SYSTEM
      );
      
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const userPermissions = [Permission.VIEW_VEHICLES, Permission.MANAGE_PARCELS, Permission.VIEW_DECISIONS];
      const requiredPermissions = [Permission.VIEW_VEHICLES, Permission.MANAGE_PARCELS];
      
      const result = service.hasAllPermissions(
        UserRole.DISPATCHER,
        userPermissions,
        requiredPermissions
      );
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks some required permissions', () => {
      const userPermissions = [Permission.VIEW_VEHICLES];
      const requiredPermissions = [Permission.VIEW_VEHICLES, Permission.MANAGE_PARCELS];
      
      const result = service.hasAllPermissions(
        UserRole.DRIVER,
        userPermissions,
        requiredPermissions
      );
      
      expect(result).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('should allow dispatcher to read vehicles', () => {
      const userPermissions = service.getPermissionsForRole(UserRole.DISPATCHER);
      
      const result = service.canAccessResource(
        UserRole.DISPATCHER,
        userPermissions,
        'vehicles',
        'read'
      );
      
      expect(result).toBe(true);
    });

    it('should allow dispatcher to write vehicles', () => {
      const userPermissions = service.getPermissionsForRole(UserRole.DISPATCHER);
      
      const result = service.canAccessResource(
        UserRole.DISPATCHER,
        userPermissions,
        'vehicles',
        'write'
      );
      
      expect(result).toBe(true);
    });

    it('should not allow driver to write vehicles', () => {
      const userPermissions = service.getPermissionsForRole(UserRole.DRIVER);
      
      const result = service.canAccessResource(
        UserRole.DRIVER,
        userPermissions,
        'vehicles',
        'write'
      );
      
      expect(result).toBe(false);
    });

    it('should not allow access to unknown resource', () => {
      const userPermissions = service.getPermissionsForRole(UserRole.ADMIN);
      
      const result = service.canAccessResource(
        UserRole.ADMIN,
        userPermissions,
        'unknown-resource',
        'read'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('isSensitiveOperation', () => {
    it('should identify sensitive operations', () => {
      expect(service.isSensitiveOperation(Permission.BYPASS_SLA)).toBe(true);
      expect(service.isSensitiveOperation(Permission.MANUAL_CUSTODY)).toBe(true);
      expect(service.isSensitiveOperation(Permission.MANAGE_SYSTEM)).toBe(true);
      expect(service.isSensitiveOperation(Permission.OVERRIDE_DECISIONS)).toBe(true);
    });

    it('should identify non-sensitive operations', () => {
      expect(service.isSensitiveOperation(Permission.VIEW_VEHICLES)).toBe(false);
      expect(service.isSensitiveOperation(Permission.VIEW_PARCELS)).toBe(false);
      expect(service.isSensitiveOperation(Permission.VIEW_DECISIONS)).toBe(false);
    });
  });

  describe('validateRolePermissions', () => {
    it('should validate permissions for admin role', () => {
      const permissions = [Permission.MANAGE_SYSTEM, Permission.VIEW_VEHICLES];
      
      const result = service.validateRolePermissions(UserRole.ADMIN, permissions);
      
      expect(result.valid).toBe(true);
      expect(result.invalidPermissions).toHaveLength(0);
    });

    it('should reject invalid permissions for driver role', () => {
      const permissions = [Permission.VIEW_VEHICLES, Permission.MANAGE_SYSTEM];
      
      const result = service.validateRolePermissions(UserRole.DRIVER, permissions);
      
      expect(result.valid).toBe(false);
      expect(result.invalidPermissions).toContain(Permission.MANAGE_SYSTEM);
    });

    it('should validate empty permissions array', () => {
      const permissions: Permission[] = [];
      
      const result = service.validateRolePermissions(UserRole.DRIVER, permissions);
      
      expect(result.valid).toBe(true);
      expect(result.invalidPermissions).toHaveLength(0);
    });
  });
});