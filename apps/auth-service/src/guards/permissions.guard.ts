import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Permission, AuthUser } from '../interfaces/auth.interfaces';
import { SecurityLoggerService } from '../services/security-logger.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private securityLogger: SecurityLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser;

    if (!user) {
      return false;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !user.permissions.includes(permission)
      );

      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.get('User-Agent') || 'unknown';
      const path = request.path;
      const method = request.method;

      await this.securityLogger.logSecurityEvent({
        type: 'permission_denied',
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: {
          path,
          method,
          requiredPermissions,
          userPermissions: user.permissions,
          missingPermissions,
          reason: 'insufficient_permissions'
        },
        severity: 'medium'
      });

      throw new ForbiddenException(`Access denied. Missing permissions: ${missingPermissions.join(', ')}`);
    }

    return true;
  }
}