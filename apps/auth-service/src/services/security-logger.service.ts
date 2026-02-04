import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityEvent } from '../entities/security-event.entity';
import { SecurityEventType, SecurityEventSeverity } from '../interfaces/auth.interfaces';

export interface SecurityEventData {
  type: SecurityEventType | string;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: SecurityEventSeverity | string;
}

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger(SecurityLoggerService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  async logSecurityEvent(eventData: SecurityEventData): Promise<SecurityEvent> {
    try {
      const securityEvent = this.securityEventRepository.create({
        type: eventData.type as SecurityEventType,
        userId: eventData.userId,
        email: eventData.email,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        details: eventData.details,
        severity: eventData.severity as SecurityEventSeverity,
      });

      const savedEvent = await this.securityEventRepository.save(securityEvent);

      // Log to application logs as well
      const logMessage = `Security Event: ${eventData.type} - User: ${eventData.email || eventData.userId} - IP: ${eventData.ipAddress}`;
      
      switch (eventData.severity) {
        case SecurityEventSeverity.CRITICAL:
          this.logger.error(logMessage, eventData.details);
          break;
        case SecurityEventSeverity.HIGH:
          this.logger.warn(logMessage, eventData.details);
          break;
        case SecurityEventSeverity.MEDIUM:
          this.logger.log(logMessage);
          break;
        default:
          this.logger.debug(logMessage);
      }

      // Alert administrators for high severity events
      if (eventData.severity === SecurityEventSeverity.HIGH || eventData.severity === SecurityEventSeverity.CRITICAL) {
        await this.alertAdministrators(savedEvent);
      }

      return savedEvent;
    } catch (error) {
      this.logger.error('Failed to log security event', error);
      throw error;
    }
  }

  async getSecurityEvents(
    filters: {
      userId?: string;
      type?: SecurityEventType;
      severity?: SecurityEventSeverity;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<{ events: SecurityEvent[]; total: number }> {
    const query = this.securityEventRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.user', 'user');

    if (filters.userId) {
      query.andWhere('event.userId = :userId', { userId: filters.userId });
    }

    if (filters.type) {
      query.andWhere('event.type = :type', { type: filters.type });
    }

    if (filters.severity) {
      query.andWhere('event.severity = :severity', { severity: filters.severity });
    }

    if (filters.startDate) {
      query.andWhere('event.timestamp >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('event.timestamp <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('event.timestamp', 'DESC')
      .limit(limit)
      .offset(offset);

    const [events, total] = await query.getManyAndCount();

    return { events, total };
  }

  async getSecurityEventStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    failedLogins: number;
    suspiciousActivity: number;
  }> {
    const query = this.securityEventRepository.createQueryBuilder('event')
      .where('event.timestamp >= :startDate', { startDate })
      .andWhere('event.timestamp <= :endDate', { endDate });

    const events = await query.getMany();

    const stats = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      failedLogins: 0,
      suspiciousActivity: 0
    };

    events.forEach(event => {
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      
      // Count by severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count specific event types
      if (event.type === SecurityEventType.LOGIN_FAILURE) {
        stats.failedLogins++;
      }
      
      if (event.type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
        stats.suspiciousActivity++;
      }
    });

    return stats;
  }

  private async alertAdministrators(securityEvent: SecurityEvent): Promise<void> {
    // This would integrate with notification systems like email, Slack, etc.
    // For now, we'll just log the alert
    this.logger.warn(`SECURITY ALERT: ${securityEvent.type} - Severity: ${securityEvent.severity}`, {
      eventId: securityEvent.id,
      userId: securityEvent.userId,
      email: securityEvent.email,
      ipAddress: securityEvent.ipAddress,
      details: securityEvent.details
    });

    // TODO: Implement actual alerting mechanism
    // - Send email to administrators
    // - Send Slack notification
    // - Create incident ticket
    // - Trigger automated response if needed
    
    // Example integration points:
    // await this.emailService.sendSecurityAlert(securityEvent);
    // await this.slackService.sendAlert(securityEvent);
    // await this.incidentService.createIncident(securityEvent);
  }
}