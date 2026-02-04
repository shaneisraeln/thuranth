import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { createHash } from 'crypto';
import { AuditLogEntity, AuditEventType } from '../entities/audit-log.entity';
import { 
  AuditLogRequest, 
  AuditLogFilter, 
  AuditReportRequest, 
  AuditReportResponse,
  DecisionAuditData,
  OverrideAuditData
} from '../interfaces/audit.interfaces';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Log a decision engine evaluation
   */
  async logDecision(
    parcelId: string,
    decisionData: DecisionAuditData,
    userId?: string,
    correlationId?: string,
  ): Promise<void> {
    const auditRequest: AuditLogRequest = {
      eventType: AuditEventType.DECISION_MADE,
      entityType: 'parcel',
      entityId: parcelId,
      userId,
      eventData: {
        ...decisionData,
        timestamp: new Date().toISOString(),
      },
      serviceName: 'decision-engine',
      correlationId,
    };

    await this.createAuditLog(auditRequest);
    this.logger.log(`Decision logged for parcel ${parcelId}`);
  }

  /**
   * Log a manual override with justification
   */
  async logManualOverride(
    entityType: string,
    entityId: string,
    overrideData: OverrideAuditData,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
    correlationId?: string,
  ): Promise<void> {
    const auditRequest: AuditLogRequest = {
      eventType: AuditEventType.MANUAL_OVERRIDE,
      entityType,
      entityId,
      userId,
      eventData: {
        ...overrideData,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
      sessionId,
      serviceName: 'audit-service',
      correlationId,
    };

    await this.createAuditLog(auditRequest);
    this.logger.warn(`Manual override logged for ${entityType} ${entityId} by user ${userId}`);
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    eventData: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
  ): Promise<void> {
    const auditRequest: AuditLogRequest = {
      eventType: AuditEventType.SECURITY_EVENT,
      entityType: 'security',
      userId,
      eventData: {
        ...eventData,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
      sessionId,
      serviceName: 'audit-service',
    };

    await this.createAuditLog(auditRequest);
    this.logger.error(`Security event logged: ${JSON.stringify(eventData)}`);
  }

  /**
   * Create an audit log entry with cryptographic integrity
   */
  async createAuditLog(request: AuditLogRequest): Promise<AuditLogEntity> {
    try {
      // Generate cryptographic hash for integrity verification
      const dataHash = this.generateDataHash(request.eventData);

      const auditLog = this.auditLogRepository.create({
        eventType: request.eventType,
        entityType: request.entityType,
        entityId: request.entityId,
        userId: request.userId,
        eventData: request.eventData,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        sessionId: request.sessionId,
        serviceName: request.serviceName,
        correlationId: request.correlationId,
        dataHash,
      });

      const savedLog = await this.auditLogRepository.save(auditLog);
      this.logger.debug(`Audit log created with ID: ${savedLog.id}`);
      
      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieve audit logs with filtering
   */
  async getAuditLogs(filter: AuditLogFilter): Promise<AuditLogEntity[]> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (filter.eventType) {
      queryBuilder.andWhere('audit.eventType = :eventType', { eventType: filter.eventType });
    }

    if (filter.entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType: filter.entityType });
    }

    if (filter.entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', { entityId: filter.entityId });
    }

    if (filter.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filter.userId });
    }

    if (filter.serviceName) {
      queryBuilder.andWhere('audit.serviceName = :serviceName', { serviceName: filter.serviceName });
    }

    if (filter.correlationId) {
      queryBuilder.andWhere('audit.correlationId = :correlationId', { correlationId: filter.correlationId });
    }

    if (filter.startDate && filter.endDate) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    }

    queryBuilder.orderBy('audit.createdAt', 'DESC');

    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Generate audit report for specified period
   */
  async generateAuditReport(request: AuditReportRequest): Promise<AuditReportResponse> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.startDate,
        endDate: request.endDate,
      });

    if (request.eventTypes && request.eventTypes.length > 0) {
      queryBuilder.andWhere('audit.eventType IN (:...eventTypes)', { eventTypes: request.eventTypes });
    }

    if (request.entityTypes && request.entityTypes.length > 0) {
      queryBuilder.andWhere('audit.entityType IN (:...entityTypes)', { entityTypes: request.entityTypes });
    }

    if (request.userIds && request.userIds.length > 0) {
      queryBuilder.andWhere('audit.userId IN (:...userIds)', { userIds: request.userIds });
    }

    // Get total count
    const totalEvents = await queryBuilder.getCount();

    // Get events by type
    const eventsByTypeQuery = this.auditLogRepository.createQueryBuilder('audit')
      .select('audit.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.startDate,
        endDate: request.endDate,
      })
      .groupBy('audit.eventType');

    const eventsByTypeResult = await eventsByTypeQuery.getRawMany();
    const eventsByType = eventsByTypeResult.reduce((acc, row) => {
      acc[row.eventType] = parseInt(row.count);
      return acc;
    }, {});

    // Get events by user
    const eventsByUserQuery = this.auditLogRepository.createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.startDate,
        endDate: request.endDate,
      })
      .andWhere('audit.userId IS NOT NULL')
      .groupBy('audit.userId');

    const eventsByUserResult = await eventsByUserQuery.getRawMany();
    const eventsByUser = eventsByUserResult.reduce((acc, row) => {
      acc[row.userId] = parseInt(row.count);
      return acc;
    }, {});

    // Get events by service
    const eventsByServiceQuery = this.auditLogRepository.createQueryBuilder('audit')
      .select('audit.serviceName', 'serviceName')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.startDate,
        endDate: request.endDate,
      })
      .andWhere('audit.serviceName IS NOT NULL')
      .groupBy('audit.serviceName');

    const eventsByServiceResult = await eventsByServiceQuery.getRawMany();
    const eventsByService = eventsByServiceResult.reduce((acc, row) => {
      acc[row.serviceName] = parseInt(row.count);
      return acc;
    }, {});

    // Get timeline data (daily counts)
    const timelineQuery = this.auditLogRepository.createQueryBuilder('audit')
      .select('DATE(audit.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.startDate,
        endDate: request.endDate,
      })
      .groupBy('DATE(audit.createdAt)')
      .orderBy('DATE(audit.createdAt)', 'ASC');

    const timelineResult = await timelineQuery.getRawMany();
    const timeline = timelineResult.map(row => ({
      date: row.date,
      count: parseInt(row.count),
    }));

    const response: AuditReportResponse = {
      totalEvents,
      eventsByType,
      eventsByUser,
      eventsByService,
      timeline,
    };

    // Include actual events if requested
    if (request.includeEventData) {
      const events = await queryBuilder
        .orderBy('audit.createdAt', 'DESC')
        .limit(1000) // Limit to prevent memory issues
        .getMany();
      response.events = events;
    }

    return response;
  }

  /**
   * Verify the cryptographic integrity of an audit log
   */
  async verifyLogIntegrity(logId: string): Promise<boolean> {
    const log = await this.auditLogRepository.findOne({ where: { id: logId } });
    if (!log) {
      return false;
    }

    const expectedHash = this.generateDataHash(log.eventData);
    return log.dataHash === expectedHash;
  }

  /**
   * Generate SHA-256 hash of event data for integrity verification
   */
  private generateDataHash(eventData: Record<string, any>): string {
    const dataString = JSON.stringify(eventData, Object.keys(eventData).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }
}