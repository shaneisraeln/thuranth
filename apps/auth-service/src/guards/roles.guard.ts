import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole, AuthUser } from '../interfaces/auth.interfaces';
import { SecurityLoggerService } from '../services/security-logger.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private securityLogger: SecurityLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser;

    if (!user) {
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
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
          requiredRoles,
          userRole: user.role,
          reason: 'insufficient_role'
        },
        severity: 'medium'
      });

      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}