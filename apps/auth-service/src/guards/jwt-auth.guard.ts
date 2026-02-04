import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SecurityLoggerService } from '../services/security-logger.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private securityLogger: SecurityLoggerService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.get('User-Agent') || 'unknown';
      const path = request.path;
      const method = request.method;

      await this.securityLogger.logSecurityEvent({
        type: 'unauthorized_access',
        ipAddress,
        userAgent,
        details: { 
          path,
          method,
          error: error.message,
          authType: 'jwt'
        },
        severity: 'medium'
      });

      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid JWT token');
    }
    return user;
  }
}