import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { UserRole, Permission, SecurityEventType, SecurityEventSeverity } from '../interfaces/auth.interfaces';
import { SecurityLoggerService } from '../services/security-logger.service';
import { SecurityEvent } from '../entities/security-event.entity';

interface SecurityEventResponse {
  id: string;
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: SecurityEventSeverity;
  timestamp: Date;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

interface SecurityStatsResponse {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  failedLogins: number;
  suspiciousActivity: number;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

@ApiTags('Security Monitoring')
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class SecurityMonitoringController {
  constructor(private securityLogger: SecurityLoggerService) {}

  @Get('events')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get security events' })
  @ApiResponse({ status: 200, description: 'Security events retrieved successfully' })
  async getSecurityEvents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('userId') userId?: string,
    @Query('type') type?: SecurityEventType,
    @Query('severity') severity?: SecurityEventSeverity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    events: SecurityEventResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filters = {
      userId,
      type,
      severity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const offset = (page - 1) * limit;
    const { events, total } = await this.securityLogger.getSecurityEvents(filters, limit, offset);

    return {
      events: events.map(event => this.mapToSecurityEventResponse(event)),
      total,
      page,
      limit,
    };
  }

  @Get('events/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get security event by ID' })
  @ApiResponse({ status: 200, description: 'Security event retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Security event not found' })
  async getSecurityEventById(@Param('id') id: string): Promise<SecurityEventResponse> {
    const { events } = await this.securityLogger.getSecurityEvents({ userId: undefined }, 1, 0);
    const event = events.find(e => e.id === id);
    
    if (!event) {
      throw new Error('Security event not found');
    }

    return this.mapToSecurityEventResponse(event);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get security statistics' })
  @ApiResponse({ status: 200, description: 'Security statistics retrieved successfully' })
  async getSecurityStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days: number = 7,
  ): Promise<SecurityStatsResponse> {
    const endDateTime = endDate ? new Date(endDate) : new Date();
    const startDateTime = startDate 
      ? new Date(startDate) 
      : new Date(endDateTime.getTime() - (days * 24 * 60 * 60 * 1000));

    const stats = await this.securityLogger.getSecurityEventStats(startDateTime, endDateTime);

    return {
      ...stats,
      timeRange: {
        startDate: startDateTime,
        endDate: endDateTime,
      },
    };
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get high-priority security alerts' })
  @ApiResponse({ status: 200, description: 'Security alerts retrieved successfully' })
  async getSecurityAlerts(
    @Query('hours') hours: number = 24,
    @Query('limit') limit: number = 20,
  ): Promise<{
    alerts: SecurityEventResponse[];
    count: number;
  }> {
    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    const { events } = await this.securityLogger.getSecurityEvents(
      {
        severity: SecurityEventSeverity.HIGH,
        startDate,
      },
      limit,
      0
    );

    const criticalEvents = await this.securityLogger.getSecurityEvents(
      {
        severity: SecurityEventSeverity.CRITICAL,
        startDate,
      },
      limit,
      0
    );

    const allAlerts = [...events, ...criticalEvents.events]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return {
      alerts: allAlerts.map(event => this.mapToSecurityEventResponse(event)),
      count: allAlerts.length,
    };
  }

  @Get('suspicious-activity')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get suspicious activity patterns' })
  @ApiResponse({ status: 200, description: 'Suspicious activity patterns retrieved successfully' })
  async getSuspiciousActivity(
    @Query('hours') hours: number = 24,
  ): Promise<{
    patterns: Array<{
      type: string;
      count: number;
      description: string;
      severity: SecurityEventSeverity;
      examples: SecurityEventResponse[];
    }>;
  }> {
    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    // Get failed login attempts
    const failedLogins = await this.securityLogger.getSecurityEvents(
      {
        type: SecurityEventType.LOGIN_FAILURE,
        startDate,
      },
      100,
      0
    );

    // Get unauthorized access attempts
    const unauthorizedAccess = await this.securityLogger.getSecurityEvents(
      {
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        startDate,
      },
      100,
      0
    );

    // Get permission denied events
    const permissionDenied = await this.securityLogger.getSecurityEvents(
      {
        type: SecurityEventType.PERMISSION_DENIED,
        startDate,
      },
      100,
      0
    );

    const patterns = [
      {
        type: 'failed_logins',
        count: failedLogins.total,
        description: 'Failed login attempts',
        severity: failedLogins.total > 10 ? SecurityEventSeverity.HIGH : SecurityEventSeverity.MEDIUM,
        examples: failedLogins.events.slice(0, 5).map(event => this.mapToSecurityEventResponse(event)),
      },
      {
        type: 'unauthorized_access',
        count: unauthorizedAccess.total,
        description: 'Unauthorized access attempts',
        severity: unauthorizedAccess.total > 5 ? SecurityEventSeverity.HIGH : SecurityEventSeverity.MEDIUM,
        examples: unauthorizedAccess.events.slice(0, 5).map(event => this.mapToSecurityEventResponse(event)),
      },
      {
        type: 'permission_denied',
        count: permissionDenied.total,
        description: 'Permission denied events',
        severity: permissionDenied.total > 20 ? SecurityEventSeverity.MEDIUM : SecurityEventSeverity.LOW,
        examples: permissionDenied.events.slice(0, 5).map(event => this.mapToSecurityEventResponse(event)),
      },
    ];

    return { patterns };
  }

  private mapToSecurityEventResponse(event: SecurityEvent): SecurityEventResponse {
    return {
      id: event.id,
      type: event.type,
      userId: event.userId,
      email: event.email,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      severity: event.severity,
      timestamp: event.timestamp,
      user: event.user ? {
        id: event.user.id,
        email: event.user.email,
        fullName: event.user.fullName,
      } : undefined,
    };
  }
}