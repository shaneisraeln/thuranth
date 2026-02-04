import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityEvent } from '../entities/security-event.entity';
import { User } from '../entities/user.entity';
import { SecurityEventType, SecurityEventSeverity, UserRole } from '../interfaces/auth.interfaces';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  threshold?: number;
  timeWindow?: number; // minutes
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: SecurityEventSeverity;
  eventCount: number;
  triggerEvent: SecurityEvent;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly alertRules: AlertRule[] = [
    {
      id: 'failed-login-threshold',
      name: 'Failed Login Threshold',
      description: 'Alert when failed login attempts exceed threshold',
      eventType: SecurityEventType.LOGIN_FAILURE,
      threshold: 5,
      timeWindow: 15, // 15 minutes
      enabled: true,
    },
    {
      id: 'account-lockout',
      name: 'Account Lockout',
      description: 'Alert when user account is locked',
      eventType: SecurityEventType.ACCOUNT_LOCKED,
      threshold: 1,
      timeWindow: 5,
      enabled: true,
    },
    {
      id: 'unauthorized-access-spike',
      name: 'Unauthorized Access Spike',
      description: 'Alert when unauthorized access attempts spike',
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      threshold: 10,
      timeWindow: 30,
      enabled: true,
    },
    {
      id: 'critical-security-event',
      name: 'Critical Security Event',
      description: 'Alert on any critical security event',
      severity: SecurityEventSeverity.CRITICAL,
      threshold: 1,
      timeWindow: 1,
      enabled: true,
    },
    {
      id: 'suspicious-activity',
      name: 'Suspicious Activity',
      description: 'Alert on suspicious activity patterns',
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      threshold: 1,
      timeWindow: 5,
      enabled: true,
    },
  ];

  private activeAlerts: Map<string, Alert> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Start periodic alert checking
    this.startAlertMonitoring();
  }

  async processSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        const shouldTrigger = await this.evaluateRule(rule, event);
        if (shouldTrigger) {
          await this.triggerAlert(rule, event);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process security event for alerting', error);
    }
  }

  private async evaluateRule(rule: AlertRule, event: SecurityEvent): Promise<boolean> {
    // Check if event matches rule criteria
    if (rule.eventType && event.type !== rule.eventType) {
      return false;
    }

    if (rule.severity && event.severity !== rule.severity) {
      return false;
    }

    // Check threshold within time window
    if (rule.threshold && rule.timeWindow) {
      const windowStart = new Date(Date.now() - (rule.timeWindow * 60 * 1000));
      
      const query = this.securityEventRepository.createQueryBuilder('event')
        .where('event.timestamp >= :windowStart', { windowStart });

      if (rule.eventType) {
        query.andWhere('event.type = :eventType', { eventType: rule.eventType });
      }

      if (rule.severity) {
        query.andWhere('event.severity = :severity', { severity: rule.severity });
      }

      const eventCount = await query.getCount();
      
      return eventCount >= rule.threshold;
    }

    return true;
  }

  private async triggerAlert(rule: AlertRule, event: SecurityEvent): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    
    // Check if similar alert is already active
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && !alert.acknowledged);

    if (existingAlert) {
      // Update existing alert
      existingAlert.eventCount++;
      existingAlert.timestamp = new Date();
      this.logger.warn(`Updated existing alert: ${rule.name} (Count: ${existingAlert.eventCount})`);
      return;
    }

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      message: await this.generateAlertMessage(rule, event),
      severity: this.determineAlertSeverity(rule, event),
      eventCount: 1,
      triggerEvent: event,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alertId, alert);

    // Send notifications
    await this.sendAlertNotifications(alert);

    this.logger.warn(`Security alert triggered: ${rule.name}`, {
      alertId,
      ruleId: rule.id,
      eventId: event.id,
      severity: alert.severity,
    });
  }

  private async generateAlertMessage(rule: AlertRule, event: SecurityEvent): Promise<string> {
    let message = `Security Alert: ${rule.name}\n`;
    message += `Description: ${rule.description}\n`;
    message += `Event Type: ${event.type}\n`;
    message += `Severity: ${event.severity}\n`;
    message += `Timestamp: ${event.timestamp.toISOString()}\n`;

    if (event.userId) {
      message += `User ID: ${event.userId}\n`;
    }

    if (event.email) {
      message += `Email: ${event.email}\n`;
    }

    message += `IP Address: ${event.ipAddress}\n`;

    if (event.userAgent) {
      message += `User Agent: ${event.userAgent}\n`;
    }

    if (Object.keys(event.details).length > 0) {
      message += `Details: ${JSON.stringify(event.details, null, 2)}\n`;
    }

    return message;
  }

  private determineAlertSeverity(rule: AlertRule, event: SecurityEvent): SecurityEventSeverity {
    // Use event severity if it's higher than medium
    if (event.severity === SecurityEventSeverity.HIGH || event.severity === SecurityEventSeverity.CRITICAL) {
      return event.severity;
    }

    // Use rule-specific logic
    switch (rule.id) {
      case 'account-lockout':
      case 'critical-security-event':
        return SecurityEventSeverity.HIGH;
      case 'failed-login-threshold':
      case 'unauthorized-access-spike':
        return SecurityEventSeverity.MEDIUM;
      default:
        return SecurityEventSeverity.MEDIUM;
    }
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    try {
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      // Send notifications to each admin
      for (const admin of adminUsers) {
        await this.sendEmailNotification(admin.email, alert);
        await this.sendSlackNotification(alert);
        // Add other notification channels as needed
      }
    } catch (error) {
      this.logger.error('Failed to send alert notifications', error);
    }
  }

  private async sendEmailNotification(email: string, alert: Alert): Promise<void> {
    // TODO: Implement email notification
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    this.logger.log(`Email notification sent to ${email} for alert: ${alert.ruleName}`);
  }

  private async sendSlackNotification(alert: Alert): Promise<void> {
    // TODO: Implement Slack notification
    // This would integrate with Slack webhook or API
    this.logger.log(`Slack notification sent for alert: ${alert.ruleName}`);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      
      this.logger.log(`Alert acknowledged: ${alert.ruleName} by ${acknowledgedBy}`);
    }
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return [...this.alertRules];
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex >= 0) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      this.logger.log(`Alert rule updated: ${ruleId}`);
    }
  }

  private startAlertMonitoring(): void {
    // Run alert monitoring every 5 minutes
    setInterval(async () => {
      try {
        await this.performPeriodicChecks();
      } catch (error) {
        this.logger.error('Error in periodic alert monitoring', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async performPeriodicChecks(): Promise<void> {
    // Check for patterns that might not be caught by individual events
    await this.checkForSuspiciousPatterns();
    await this.cleanupOldAlerts();
  }

  private async checkForSuspiciousPatterns(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
    
    // Check for multiple failed logins from same IP
    const failedLoginsByIP = await this.securityEventRepository
      .createQueryBuilder('event')
      .select('event.ipAddress, COUNT(*) as count')
      .where('event.type = :type', { type: SecurityEventType.LOGIN_FAILURE })
      .andWhere('event.timestamp >= :since', { since: oneHourAgo })
      .groupBy('event.ipAddress')
      .having('COUNT(*) >= :threshold', { threshold: 10 })
      .getRawMany();

    for (const result of failedLoginsByIP) {
      // Create suspicious activity event
      const suspiciousEvent = this.securityEventRepository.create({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        ipAddress: result.ipAddress,
        details: {
          pattern: 'multiple_failed_logins_same_ip',
          count: result.count,
          timeWindow: '1 hour',
        },
        severity: SecurityEventSeverity.HIGH,
      });

      await this.securityEventRepository.save(suspiciousEvent);
      await this.processSecurityEvent(suspiciousEvent);
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.acknowledged && alert.acknowledgedAt && alert.acknowledgedAt.getTime() < oneDayAgo) {
        this.activeAlerts.delete(alertId);
      }
    }
  }
}