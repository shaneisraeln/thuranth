import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from '../interfaces/auth.interfaces';
import { SecurityLoggerService } from '../services/security-logger.service';
import { SENSITIVE_OPERATION_KEY } from '../decorators/sensitive-operation.decorator';

@Injectable()
export class SensitiveOperationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private securityLogger: SecurityLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireAdditionalAuth = this.reflector.getAllAndOverride<boolean>(SENSITIVE_OPERATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireAdditionalAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser;

    if (!user) {
      return false;
    }

    // Check for additional authentication header (e.g., password confirmation, MFA token)
    const additionalAuth = request.headers['x-additional-auth'] as string;
    const mfaToken = request.headers['x-mfa-token'] as string;

    if (!additionalAuth && !mfaToken) {
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.get('User-Agent') || 'unknown';
      const path = request.path;
      const method = request.method;

      await this.securityLogger.logSecurityEvent({
        type: 'unauthorized_access',
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: {
          path,
          method,
          reason: 'missing_additional_auth',
          sensitiveOperation: true
        },
        severity: 'high'
      });

      throw new UnauthorizedException('Additional authentication required for sensitive operation');
    }

    // Log successful sensitive operation access
    const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';

    await this.securityLogger.logSecurityEvent({
      type: 'login_success',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      details: {
        path: request.path,
        method: request.method,
        sensitiveOperation: true,
        additionalAuthProvided: !!additionalAuth,
        mfaProvided: !!mfaToken
      },
      severity: 'medium'
    });

    return true;
  }
}