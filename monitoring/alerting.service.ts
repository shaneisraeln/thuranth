/**
 * Alerting Service
 * 
 * Provides comprehensive alerting capabilities for the PDCP system,
 * including SLA risk detection, system failure alerts, and performance
 * threshold monitoring with multiple notification channels.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export enum AlertType {
  SLA_RISK = 'sla_risk',
  SYSTEM_FAILURE = 'system_failure',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SECURITY_INCIDENT = 'security_incident',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  EXTERNAL_SERVICE_FAILURE = 'external_service_failure',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: string;
  threshold: number;
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertCooldowns = new Map<string, Date>();

  // Default alert rules
  private readonly defaultAlertRules: AlertRule[] = [
    {
      id: 'sla-risk-critical',
      name: 'Critical SLA Risk',
      type: AlertType.SLA_RISK,
      severity: AlertSeverity.CRITICAL,
      condition: 'parcels_at_sla_risk > 10',
      threshold: 10,
      enabled: true,
      cooldownMinutes: 15,
      notificationChannels: ['email', 'slack'],
    },
    {
      id: 'sla-risk-warning',
      name: 'SLA Risk Warning',
      type: AlertType.SLA_RISK,
      severity: AlertSeverity.HIGH,
      condition: 'parcels_at_sla_risk > 5',
      threshold: 5,
      enabled: true,
      cooldownMinutes: 30,
      notificationChannels: ['email'],
    },
    {
      id: 'database-connection-failure',
      name: 'Database Connection Failure',
      type: AlertType.SYSTEM_FAILURE,
      severity: AlertSeverity.CRITICAL,
      condition: 'database_connectivity = false',
      threshold: 1,
      enabled: true,
      cooldownMinutes: 5,
      notificationChannels: ['email', 'slack', 'sms'],
    },
    {
      id: 'high-response-time',
      name: 'High Response Time',
      type: AlertType.PERFORMANCE_DEGRADATION,
      severity: AlertSeverity.MEDIUM,
      condition: 'avg_response_time > 1000',
      threshold: 1000,
      enabled: true,
      cooldownMinutes: 10,
      notificationChannels: ['email'],
    },
    {
      id: 'memory-usage-high',
      name: 'High Memory Usage',
      type: AlertType.RESOURCE_EXHAUSTION,
      severity: AlertSeverity.HIGH,
      condition: 'memory_usage_percent > 90',
      threshold: 90,
      enabled: true,
      cooldownMinutes: 15,
      notificationChannels: ['email', 'slack'],
    },
    {
      id: 'failed-decisions-high',
      name: 'High Decision Failure Rate',
      type: AlertType.BUSINESS_LOGIC_ERROR,
      severity: AlertSeverity.HIGH,
      condition: 'decision_failure_rate > 5',
      threshold: 5,
      enabled: true,
      cooldownMinutes: 20,
      notificationChannels: ['email'],
    },
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.initializeAlertRules();
  }

  /**
   * Initialize alert rules in Redis
   */
  private async initializeAlertRules(): Promise<void> {
    try {
      for (const rule of this.defaultAlertRules) {
        await this.redis.hset(
          'alert-rules',
          rule.id,
          JSON.stringify(rule)
        );
      }
      this.logger.log(`Initialized ${this.defaultAlertRules.length} alert rules`);
    } catch (error) {
      this.logger.error('Failed to initialize alert rules', error);
    }
  }

  /**
   * Check SLA risks and trigger alerts
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSLARisks(): Promise<void> {
    try {
      this.logger.debug('Checking SLA risks...');

      // Get parcels at risk (within 2 hours of SLA deadline)
      const slaRiskQuery = `
        SELECT 
          p.id,
          p.tracking_number,
          p.sla_deadline,
          p.status,
          p.assigned_vehicle_id,
          EXTRACT(EPOCH FROM (p.sla_deadline - NOW())) / 3600 as hours_remaining
        FROM parcels p
        WHERE p.status IN ('PENDING', 'ASSIGNED', 'IN_TRANSIT')
        AND p.sla_deadline <= NOW() + INTERVAL '2 hours'
        ORDER BY p.sla_deadline ASC
      `;

      const riskyParcels = await this.connection.query(slaRiskQuery);

      if (riskyParcels.length > 0) {
        // Check alert thresholds
        await this.evaluateAlertRule('sla-risk-critical', riskyParcels.length, {
          riskyParcels: riskyParcels.length,
          parcels: riskyParcels.slice(0, 10), // Include first 10 for details
        });

        await this.evaluateAlertRule('sla-risk-warning', riskyParcels.length, {
          riskyParcels: riskyParcels.length,
          parcels: riskyParcels.slice(0, 5),
        });

        // Check for overdue parcels (past SLA deadline)
        const overdueParcels = riskyParcels.filter(p => p.hours_remaining < 0);
        if (overdueParcels.length > 0) {
          await this.createAlert({
            type: AlertType.SLA_RISK,
            severity: AlertSeverity.CRITICAL,
            title: 'SLA Deadline Breached',
            message: `${overdueParcels.length} parcels have exceeded their SLA deadline`,
            source: 'sla-monitor',
            metadata: {
              overdueParcels: overdueParcels.length,
              parcels: overdueParcels.slice(0, 5),
            },
          });
        }
      }

      this.logger.debug(`SLA risk check completed - ${riskyParcels.length} parcels at risk`);
    } catch (error) {
      this.logger.error('SLA risk check failed', error);
      await this.createAlert({
        type: AlertType.SYSTEM_FAILURE,
        severity: AlertSeverity.HIGH,
        title: 'SLA Monitoring Failure',
        message: 'Failed to check SLA risks',
        source: 'sla-monitor',
        metadata: { error: error.message },
      });
    }
  }

  /**
   * Check system health and trigger alerts
   */
  @Cron(CronExpression.EVERY_2_MINUTES)
  async checkSystemHealth(): Promise<void> {
    try {
      this.logger.debug('Checking system health...');

      // Check database connectivity
      try {
        await this.connection.query('SELECT 1');
      } catch (error) {
        await this.evaluateAlertRule('database-connection-failure', 1, {
          error: error.message,
          timestamp: new Date(),
        });
      }

      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      await this.evaluateAlertRule('memory-usage-high', memoryPercent, {
        memoryPercent: memoryPercent.toFixed(2),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      });

      // Check decision engine performance
      const decisionMetrics = await this.getDecisionEngineMetrics();
      if (decisionMetrics.failureRate > 0) {
        await this.evaluateAlertRule('failed-decisions-high', decisionMetrics.failureRate, {
          failureRate: decisionMetrics.failureRate,
          totalDecisions: decisionMetrics.totalDecisions,
          failedDecisions: decisionMetrics.failedDecisions,
          timeWindow: '1 hour',
        });
      }

      this.logger.debug('System health check completed');
    } catch (error) {
      this.logger.error('System health check failed', error);
    }
  }

  /**
   * Check performance metrics and trigger alerts
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkPerformanceMetrics(): Promise<void> {
    try {
      this.logger.debug('Checking performance metrics...');

      // Get average response times from the last 10 minutes
      const performanceQuery = `
        SELECT 
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_response_time_ms,
          COUNT(*) as total_requests
        FROM decisions 
        WHERE created_at >= NOW() - INTERVAL '10 minutes'
      `;

      const performanceResult = await this.connection.query(performanceQuery);
      
      if (performanceResult.length > 0 && performanceResult[0].total_requests > 0) {
        const avgResponseTime = parseFloat(performanceResult[0].avg_response_time_ms);
        
        await this.evaluateAlertRule('high-response-time', avgResponseTime, {
          avgResponseTime: avgResponseTime.toFixed(2),
          totalRequests: performanceResult[0].total_requests,
          timeWindow: '10 minutes',
        });
      }

      this.logger.debug('Performance metrics check completed');
    } catch (error) {
      this.logger.error('Performance metrics check failed', error);
    }
  }

  /**
   * Evaluate an alert rule and create alert if threshold is exceeded
   */
  private async evaluateAlertRule(
    ruleId: string,
    currentValue: number,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const ruleData = await this.redis.hget('alert-rules', ruleId);
      if (!ruleData) {
        this.logger.warn(`Alert rule not found: ${ruleId}`);
        return;
      }

      const rule: AlertRule = JSON.parse(ruleData);
      
      if (!rule.enabled) {
        return;
      }

      // Check if we're in cooldown period
      const cooldownKey = `alert-cooldown:${ruleId}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (lastAlert) {
        const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldownMinutes * 60 * 1000);
        if (new Date() < cooldownEnd) {
          return; // Still in cooldown
        }
      }

      // Check if threshold is exceeded
      if (currentValue >= rule.threshold) {
        await this.createAlert({
          type: rule.type,
          severity: rule.severity,
          title: rule.name,
          message: `${rule.name}: Current value ${currentValue} exceeds threshold ${rule.threshold}`,
          source: `rule:${ruleId}`,
          metadata: {
            ...metadata,
            rule: rule.name,
            threshold: rule.threshold,
            currentValue,
          },
        });

        // Set cooldown
        this.alertCooldowns.set(cooldownKey, new Date());
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate alert rule ${ruleId}`, error);
    }
  }

  /**
   * Create and send an alert
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<Alert> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    try {
      // Store alert
      this.activeAlerts.set(alert.id, alert);
      await this.redis.hset('active-alerts', alert.id, JSON.stringify(alert));

      // Log alert
      this.logger.warn(`Alert created: [${alert.severity.toUpperCase()}] ${alert.title}`, {
        alertId: alert.id,
        type: alert.type,
        source: alert.source,
        metadata: alert.metadata,
      });

      // Send notifications
      await this.sendNotifications(alert);

      // Store in audit log
      await this.storeAlertInAuditLog(alert);

      return alert;
    } catch (error) {
      this.logger.error('Failed to create alert', error);
      throw error;
    }
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    try {
      // Get notification channels based on alert severity
      const channels = await this.getNotificationChannels(alert.severity);

      const notificationPromises = channels.map(channel => 
        this.sendNotification(channel, alert).catch(error => {
          this.logger.error(`Failed to send notification via ${channel.type}`, error);
        })
      );

      await Promise.allSettled(notificationPromises);
    } catch (error) {
      this.logger.error('Failed to send notifications', error);
    }
  }

  /**
   * Send notification via specific channel
   */
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    if (!channel.enabled) {
      return;
    }

    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
      case 'sms':
        await this.sendSMSNotification(channel, alert);
        break;
      default:
        this.logger.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // In a real implementation, you would integrate with an email service
    this.logger.log(`[EMAIL] Alert: ${alert.title} - ${alert.message}`);
    
    // Example email content
    const emailContent = {
      to: channel.config.recipients || ['admin@pdcp.com'],
      subject: `[PDCP Alert - ${alert.severity.toUpperCase()}] ${alert.title}`,
      body: `
        Alert Details:
        - Type: ${alert.type}
        - Severity: ${alert.severity}
        - Source: ${alert.source}
        - Time: ${alert.timestamp.toISOString()}
        - Message: ${alert.message}
        
        Metadata: ${JSON.stringify(alert.metadata, null, 2)}
        
        Alert ID: ${alert.id}
      `,
    };

    // Here you would send the actual email
    this.logger.debug('Email notification prepared', emailContent);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    try {
      const webhookUrl = channel.config.webhookUrl;
      if (!webhookUrl) {
        this.logger.warn('Slack webhook URL not configured');
        return;
      }

      const color = this.getSlackColor(alert.severity);
      const slackMessage = {
        text: `PDCP Alert: ${alert.title}`,
        attachments: [
          {
            color,
            fields: [
              { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
              { title: 'Type', value: alert.type, short: true },
              { title: 'Source', value: alert.source, short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
              { title: 'Message', value: alert.message, short: false },
            ],
            footer: `Alert ID: ${alert.id}`,
          },
        ],
      };

      await firstValueFrom(
        this.httpService.post(webhookUrl, slackMessage, {
          timeout: 5000,
        })
      );

      this.logger.log(`Slack notification sent for alert ${alert.id}`);
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    try {
      const webhookUrl = channel.config.url;
      if (!webhookUrl) {
        this.logger.warn('Webhook URL not configured');
        return;
      }

      const payload = {
        alert,
        timestamp: new Date().toISOString(),
        source: 'pdcp-alerting-service',
      };

      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-PDCP-Alert': 'true',
          },
        })
      );

      this.logger.log(`Webhook notification sent for alert ${alert.id}`);
    } catch (error) {
      this.logger.error('Failed to send webhook notification', error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // In a real implementation, you would integrate with an SMS service
    this.logger.log(`[SMS] Alert: ${alert.title} - ${alert.message}`);
    
    const smsContent = {
      to: channel.config.phoneNumbers || ['+1234567890'],
      message: `PDCP Alert [${alert.severity.toUpperCase()}]: ${alert.title}. ${alert.message}. ID: ${alert.id}`,
    };

    // Here you would send the actual SMS
    this.logger.debug('SMS notification prepared', smsContent);
  }

  /**
   * Get notification channels for alert severity
   */
  private async getNotificationChannels(severity: AlertSeverity): Promise<NotificationChannel[]> {
    // Default notification channels based on severity
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'email-default',
        name: 'Default Email',
        type: 'email',
        config: { recipients: ['admin@pdcp.com', 'ops@pdcp.com'] },
        enabled: true,
      },
    ];

    if (severity === AlertSeverity.CRITICAL) {
      defaultChannels.push({
        id: 'slack-critical',
        name: 'Critical Slack',
        type: 'slack',
        config: { webhookUrl: this.configService.get('SLACK_WEBHOOK_URL') },
        enabled: !!this.configService.get('SLACK_WEBHOOK_URL'),
      });

      defaultChannels.push({
        id: 'sms-critical',
        name: 'Critical SMS',
        type: 'sms',
        config: { phoneNumbers: [this.configService.get('EMERGENCY_PHONE')] },
        enabled: !!this.configService.get('EMERGENCY_PHONE'),
      });
    }

    return defaultChannels.filter(channel => channel.enabled);
  }

  /**
   * Get Slack color for alert severity
   */
  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'danger';
      case AlertSeverity.HIGH:
        return 'warning';
      case AlertSeverity.MEDIUM:
        return '#ffaa00';
      case AlertSeverity.LOW:
        return 'good';
      case AlertSeverity.INFO:
        return '#36a64f';
      default:
        return '#cccccc';
    }
  }

  /**
   * Get decision engine metrics
   */
  private async getDecisionEngineMetrics(): Promise<{
    totalDecisions: number;
    failedDecisions: number;
    failureRate: number;
  }> {
    try {
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_decisions,
          COUNT(*) FILTER (WHERE recommended_vehicle_id IS NULL AND NOT shadow_mode) as failed_decisions
        FROM decisions 
        WHERE request_timestamp >= NOW() - INTERVAL '1 hour'
      `;

      const result = await this.connection.query(metricsQuery);
      
      if (result.length > 0) {
        const totalDecisions = parseInt(result[0].total_decisions);
        const failedDecisions = parseInt(result[0].failed_decisions);
        const failureRate = totalDecisions > 0 ? (failedDecisions / totalDecisions) * 100 : 0;

        return {
          totalDecisions,
          failedDecisions,
          failureRate,
        };
      }

      return { totalDecisions: 0, failedDecisions: 0, failureRate: 0 };
    } catch (error) {
      this.logger.error('Failed to get decision engine metrics', error);
      return { totalDecisions: 0, failedDecisions: 0, failureRate: 0 };
    }
  }

  /**
   * Store alert in audit log
   */
  private async storeAlertInAuditLog(alert: Alert): Promise<void> {
    try {
      await this.connection.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, 
          details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'alert',
        alert.id,
        'alert_created',
        'system',
        JSON.stringify({
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          metadata: alert.metadata,
        }),
        alert.timestamp,
      ]);
    } catch (error) {
      this.logger.error('Failed to store alert in audit log', error);
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      alert.resolved = true;
      alert.resolvedAt = new Date();
      if (resolvedBy) {
        alert.acknowledgedBy = resolvedBy;
        alert.acknowledgedAt = new Date();
      }

      // Update in Redis
      await this.redis.hset('active-alerts', alertId, JSON.stringify(alert));
      
      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      this.logger.log(`Alert resolved: ${alertId} by ${resolvedBy || 'system'}`);
    } catch (error) {
      this.logger.error(`Failed to resolve alert ${alertId}`, error);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(timeWindow: string = '24 hours'): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    resolvedAlerts: number;
    averageResolutionTime: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE details->>'severity' = 'critical') as critical_alerts,
          COUNT(*) FILTER (WHERE details->>'severity' = 'high') as high_alerts,
          COUNT(*) FILTER (WHERE details->>'severity' = 'medium') as medium_alerts,
          COUNT(*) FILTER (WHERE details->>'severity' = 'low') as low_alerts,
          COUNT(*) FILTER (WHERE action = 'alert_resolved') as resolved_alerts
        FROM audit_logs 
        WHERE entity_type = 'alert' 
        AND created_at >= NOW() - INTERVAL '${timeWindow}'
      `;

      const result = await this.connection.query(statsQuery);
      
      if (result.length > 0) {
        const stats = result[0];
        return {
          totalAlerts: parseInt(stats.total_alerts),
          alertsBySeverity: {
            critical: parseInt(stats.critical_alerts),
            high: parseInt(stats.high_alerts),
            medium: parseInt(stats.medium_alerts),
            low: parseInt(stats.low_alerts),
          },
          alertsByType: {}, // Would need additional query for type breakdown
          resolvedAlerts: parseInt(stats.resolved_alerts),
          averageResolutionTime: 0, // Would need additional calculation
        };
      }

      return {
        totalAlerts: 0,
        alertsBySeverity: {},
        alertsByType: {},
        resolvedAlerts: 0,
        averageResolutionTime: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get alert statistics', error);
      throw error;
    }
  }
}