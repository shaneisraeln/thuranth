/**
 * Monitoring Controller
 * 
 * Provides REST API endpoints for accessing health status, metrics,
 * and alerting information for the PDCP system monitoring dashboard.
 */

import { Controller, Get, Post, Param, Query, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { HealthCheckService, HealthStatus } from './health-check.service';
import { AlertingService, Alert, AlertSeverity, AlertType } from './alerting.service';
import { MetricsService, SystemMetrics, BusinessMetrics, DatabaseMetrics } from './metrics.service';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly alertingService: AlertingService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Get comprehensive health status
   */
  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus(): Promise<HealthStatus> {
    return await this.healthCheckService.getHealthStatus();
  }

  /**
   * Get health summary for quick status check
   */
  @Get('health/summary')
  @ApiOperation({ summary: 'Get health summary' })
  @ApiResponse({ status: 200, description: 'Health summary retrieved successfully' })
  async getHealthSummary(): Promise<{
    status: string;
    uptime: number;
    timestamp: Date;
    criticalIssues: number;
    warnings: number;
  }> {
    return await this.healthCheckService.getHealthSummary();
  }

  /**
   * Get current system metrics
   */
  @Get('metrics/system')
  @ApiOperation({ summary: 'Get current system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getSystemMetrics(): Promise<SystemMetrics> {
    return await this.metricsService.getSystemMetrics();
  }

  /**
   * Get current business metrics
   */
  @Get('metrics/business')
  @ApiOperation({ summary: 'Get current business metrics' })
  @ApiResponse({ status: 200, description: 'Business metrics retrieved successfully' })
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    return await this.metricsService.getBusinessMetrics();
  }

  /**
   * Get current database metrics
   */
  @Get('metrics/database')
  @ApiOperation({ summary: 'Get current database metrics' })
  @ApiResponse({ status: 200, description: 'Database metrics retrieved successfully' })
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    return await this.metricsService.getDatabaseMetrics();
  }

  /**
   * Get comprehensive metrics summary
   */
  @Get('metrics/summary')
  @ApiOperation({ summary: 'Get comprehensive metrics summary' })
  @ApiResponse({ status: 200, description: 'Metrics summary retrieved successfully' })
  async getMetricsSummary(): Promise<{
    system: SystemMetrics;
    business: BusinessMetrics;
    database: DatabaseMetrics;
  }> {
    return await this.metricsService.getCurrentMetricsSummary();
  }

  /**
   * Get metrics time series data
   */
  @Get('metrics/timeseries/:metricName')
  @ApiOperation({ summary: 'Get metrics time series data' })
  @ApiParam({ name: 'metricName', description: 'Name of the metric' })
  @ApiQuery({ name: 'startTime', description: 'Start time (ISO string)', required: false })
  @ApiQuery({ name: 'endTime', description: 'End time (ISO string)', required: false })
  @ApiQuery({ name: 'timeWindow', description: 'Time window (e.g., "1 hour", "24 hours")', required: false })
  @ApiResponse({ status: 200, description: 'Time series data retrieved successfully' })
  async getMetricsTimeSeries(
    @Param('metricName') metricName: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('timeWindow') timeWindow?: string,
  ): Promise<any[]> {
    let start: Date;
    let end: Date = new Date();

    if (startTime && endTime) {
      start = new Date(startTime);
      end = new Date(endTime);
    } else if (timeWindow) {
      const windowMs = this.parseTimeWindow(timeWindow);
      start = new Date(end.getTime() - windowMs);
    } else {
      // Default to last hour
      start = new Date(end.getTime() - 60 * 60 * 1000);
    }

    return await this.metricsService.getMetricsTimeSeries(metricName, start, end);
  }

  /**
   * Get dashboard metrics
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiQuery({ name: 'timeWindow', description: 'Time window for trends', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(
    @Query('timeWindow') timeWindow: string = '1 hour',
  ): Promise<{
    summary: any;
    trends: Record<string, any[]>;
    alerts: number;
  }> {
    return await this.metricsService.getDashboardMetrics(timeWindow);
  }

  /**
   * Get metric percentiles
   */
  @Get('metrics/:metricName/percentiles')
  @ApiOperation({ summary: 'Get metric percentiles' })
  @ApiParam({ name: 'metricName', description: 'Name of the metric' })
  @ApiQuery({ name: 'timeWindow', description: 'Time window', required: false })
  @ApiQuery({ name: 'percentiles', description: 'Comma-separated percentiles (e.g., "50,90,95,99")', required: false })
  @ApiResponse({ status: 200, description: 'Metric percentiles retrieved successfully' })
  async getMetricPercentiles(
    @Param('metricName') metricName: string,
    @Query('timeWindow') timeWindow: string = '1 hour',
    @Query('percentiles') percentilesStr?: string,
  ): Promise<Record<string, number>> {
    const percentiles = percentilesStr 
      ? percentilesStr.split(',').map(p => parseInt(p.trim()))
      : [50, 90, 95, 99];

    return await this.metricsService.getMetricPercentiles(metricName, timeWindow, percentiles);
  }

  /**
   * Record custom metric
   */
  @Post('metrics/custom')
  @ApiOperation({ summary: 'Record custom metric' })
  @ApiResponse({ status: 201, description: 'Custom metric recorded successfully' })
  async recordCustomMetric(
    @Body() body: {
      name: string;
      value: number;
      tags?: Record<string, string>;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.metricsService.recordMetric(body.name, body.value, body.tags || {});
      return {
        success: true,
        message: `Custom metric ${body.name} recorded successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to record custom metric: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get active alerts
   */
  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved successfully' })
  async getActiveAlerts(): Promise<Alert[]> {
    return await this.alertingService.getActiveAlerts();
  }

  /**
   * Get alert statistics
   */
  @Get('alerts/statistics')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiQuery({ name: 'timeWindow', description: 'Time window for statistics', required: false })
  @ApiResponse({ status: 200, description: 'Alert statistics retrieved successfully' })
  async getAlertStatistics(
    @Query('timeWindow') timeWindow: string = '24 hours',
  ): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    resolvedAlerts: number;
    averageResolutionTime: number;
  }> {
    return await this.alertingService.getAlertStatistics(timeWindow);
  }

  /**
   * Create manual alert
   */
  @Post('alerts')
  @ApiOperation({ summary: 'Create manual alert' })
  @ApiResponse({ status: 201, description: 'Alert created successfully' })
  async createAlert(
    @Body() alertData: {
      type: AlertType;
      severity: AlertSeverity;
      title: string;
      message: string;
      source: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Alert> {
    return await this.alertingService.createAlert(alertData);
  }

  /**
   * Resolve alert
   */
  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { resolvedBy?: string },
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.alertingService.resolveAlert(alertId, body.resolvedBy);
      return {
        success: true,
        message: `Alert ${alertId} resolved successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to resolve alert: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get system status overview
   */
  @Get('status')
  @ApiOperation({ summary: 'Get system status overview' })
  @ApiResponse({ status: 200, description: 'System status overview retrieved successfully' })
  async getSystemStatus(): Promise<{
    overall: string;
    services: Record<string, string>;
    metrics: {
      uptime: number;
      memoryUsage: number;
      cpuUsage: number;
      activeConnections: number;
    };
    alerts: {
      active: number;
      critical: number;
      warnings: number;
    };
    lastUpdated: Date;
  }> {
    const [healthStatus, systemMetrics, activeAlerts] = await Promise.all([
      this.healthCheckService.getHealthStatus(),
      this.metricsService.getSystemMetrics(),
      this.alertingService.getActiveAlerts(),
    ]);

    // Extract service statuses
    const services: Record<string, string> = {};
    healthStatus.checks.forEach(check => {
      services[check.name] = check.status;
    });

    // Count alerts by severity
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === AlertSeverity.CRITICAL).length;
    const warningAlerts = activeAlerts.filter(alert => 
      alert.severity === AlertSeverity.HIGH || alert.severity === AlertSeverity.MEDIUM
    ).length;

    return {
      overall: healthStatus.status,
      services,
      metrics: {
        uptime: healthStatus.uptime,
        memoryUsage: systemMetrics.memory.percentage,
        cpuUsage: systemMetrics.cpu.usage,
        activeConnections: healthStatus.metrics.database.connections,
      },
      alerts: {
        active: activeAlerts.length,
        critical: criticalAlerts,
        warnings: warningAlerts,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get performance report
   */
  @Get('performance/report')
  @ApiOperation({ summary: 'Get performance report' })
  @ApiQuery({ name: 'timeWindow', description: 'Time window for report', required: false })
  @ApiResponse({ status: 200, description: 'Performance report retrieved successfully' })
  async getPerformanceReport(
    @Query('timeWindow') timeWindow: string = '24 hours',
  ): Promise<{
    summary: {
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
      availability: number;
    };
    trends: Record<string, any>;
    recommendations: string[];
  }> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeWindow(timeWindow));

    // Get performance metrics
    const businessMetrics = await this.metricsService.getBusinessMetrics();
    const systemMetrics = await this.metricsService.getSystemMetrics();

    // Calculate availability (simplified)
    const availability = 99.5; // Would calculate based on actual uptime data

    // Get trends
    const trends = {
      responseTime: await this.metricsService.getMetricsTimeSeries(
        'business.decisions.averageResponseTime',
        startTime,
        endTime
      ),
      throughput: await this.metricsService.getMetricsTimeSeries(
        'business.decisions.throughput',
        startTime,
        endTime
      ),
      memoryUsage: await this.metricsService.getMetricsTimeSeries(
        'system.memory.percentage',
        startTime,
        endTime
      ),
    };

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (businessMetrics.decisions.averageResponseTime > 500) {
      recommendations.push('Consider optimizing decision engine algorithms to reduce response time');
    }
    
    if (systemMetrics.memory.percentage > 80) {
      recommendations.push('Memory usage is high - consider increasing available memory or optimizing memory usage');
    }
    
    if (businessMetrics.parcels.slaRisk > 5) {
      recommendations.push('High number of parcels at SLA risk - review capacity planning and routing optimization');
    }

    if (systemMetrics.eventLoop.delay > 10) {
      recommendations.push('Event loop delay is high - review for blocking operations');
    }

    return {
      summary: {
        averageResponseTime: businessMetrics.decisions.averageResponseTime,
        throughput: businessMetrics.decisions.throughput,
        errorRate: businessMetrics.decisions.total > 0 
          ? (businessMetrics.decisions.failed / businessMetrics.decisions.total) * 100 
          : 0,
        availability,
      },
      trends,
      recommendations,
    };
  }

  /**
   * Parse time window string to milliseconds
   */
  private parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)\s*(minute|hour|day)s?$/i);
    if (!match) {
      return 60 * 60 * 1000; // Default to 1 hour
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'minute':
        return value * 60 * 1000;
      case 'hour':
        return value * 60 * 60 * 1000;
      case 'day':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }
}