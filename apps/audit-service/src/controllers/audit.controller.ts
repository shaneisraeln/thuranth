import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Param, 
  HttpStatus, 
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLoggerService } from '../services/audit-logger.service';
import { 
  AuditLogRequest, 
  AuditLogFilter, 
  AuditReportRequest,
  DecisionAuditData,
  OverrideAuditData,
} from '../interfaces/audit.interfaces';
import { AuditEventType } from '../entities/audit-log.entity';

@ApiTags('audit')
@Controller('audit')
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditLoggerService: AuditLoggerService) {}

  @Post('log')
  @ApiOperation({ summary: 'Create an audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  async createAuditLog(@Body() request: AuditLogRequest) {
    try {
      const auditLog = await this.auditLoggerService.createAuditLog(request);
      return {
        success: true,
        data: { id: auditLog.id },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create audit log: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('log/decision')
  @ApiOperation({ summary: 'Log a decision engine evaluation' })
  @ApiResponse({ status: 201, description: 'Decision audit log created successfully' })
  async logDecision(
    @Body() body: {
      parcelId: string;
      decisionData: DecisionAuditData;
      userId?: string;
      correlationId?: string;
    },
  ) {
    try {
      await this.auditLoggerService.logDecision(
        body.parcelId,
        body.decisionData,
        body.userId,
        body.correlationId,
      );
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to log decision: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('log/override')
  @ApiOperation({ summary: 'Log a manual override with justification' })
  @ApiResponse({ status: 201, description: 'Override audit log created successfully' })
  async logManualOverride(
    @Body() body: {
      entityType: string;
      entityId: string;
      overrideData: OverrideAuditData;
      userId: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      correlationId?: string;
    },
  ) {
    try {
      await this.auditLoggerService.logManualOverride(
        body.entityType,
        body.entityId,
        body.overrideData,
        body.userId,
        body.ipAddress,
        body.userAgent,
        body.sessionId,
        body.correlationId,
      );
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to log manual override: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('log/security')
  @ApiOperation({ summary: 'Log a security event' })
  @ApiResponse({ status: 201, description: 'Security audit log created successfully' })
  async logSecurityEvent(
    @Body() body: {
      eventData: Record<string, any>;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    },
  ) {
    try {
      await this.auditLoggerService.logSecurityEvent(
        body.eventData,
        body.userId,
        body.ipAddress,
        body.userAgent,
        body.sessionId,
      );
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to log security event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('logs')
  @ApiOperation({ summary: 'Retrieve audit logs with filtering' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('eventType') eventType?: AuditEventType,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('serviceName') serviceName?: string,
    @Query('correlationId') correlationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const filter: AuditLogFilter = {
        eventType,
        entityType,
        entityId,
        userId,
        serviceName,
        correlationId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
      };

      const logs = await this.auditLoggerService.getAuditLogs(filter);
      return {
        success: true,
        data: logs,
        count: logs.length,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve audit logs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('report')
  @ApiOperation({ summary: 'Generate audit report for specified period' })
  @ApiResponse({ status: 200, description: 'Audit report generated successfully' })
  async generateAuditReport(@Body() request: AuditReportRequest) {
    try {
      const report = await this.auditLoggerService.generateAuditReport(request);
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate audit report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('verify/:logId')
  @ApiOperation({ summary: 'Verify the cryptographic integrity of an audit log' })
  @ApiResponse({ status: 200, description: 'Integrity verification completed' })
  async verifyLogIntegrity(@Param('logId') logId: string) {
    try {
      const isValid = await this.auditLoggerService.verifyLogIntegrity(logId);
      return {
        success: true,
        data: {
          logId,
          isValid,
          message: isValid ? 'Log integrity verified' : 'Log integrity compromised',
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to verify log integrity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}