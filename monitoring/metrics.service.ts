/**
 * Metrics Service
 * 
 * Collects, aggregates, and provides access to system performance metrics,
 * business metrics, and operational KPIs for the PDCP system.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { performance } from 'perf_hooks';

export interface MetricPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  unit: string;
  description: string;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
  gc: {
    collections: number;
    duration: number;
  };
}

export interface BusinessMetrics {
  timestamp: Date;
  decisions: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    throughput: number;
  };
  vehicles: {
    active: number;
    utilization: number;
    averageCapacityUsed: number;
  };
  parcels: {
    pending: number;
    inTransit: number;
    delivered: number;
    slaRisk: number;
    slaBreached: number;
  };
  consolidation: {
    vehiclesAvoided: number;
    utilizationImprovement: number;
    emissionsSaved: number;
  };
}

export interface DatabaseMetrics {
  timestamp: Date;
  connections: {
    active: number;
    idle: number;
    total: number;
    utilization: number;
  };
  queries: {
    total: number;
    slow: number;
    averageTime: number;
    longestTime: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
  };
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metricsBuffer = new Map<string, MetricPoint[]>();
  private readonly maxBufferSize = 1000;
  private gcStats = { collections: 0, duration: 0 };

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.initializeGCMonitoring();
  }

  /**
   * Initialize garbage collection monitoring
   */
  private initializeGCMonitoring(): void {
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        const start = performance.now();
        const result = originalGC();
        const duration = performance.now() - start;
        
        this.gcStats.collections++;
        this.gcStats.duration += duration;
        
        return result;
      };
    }
  }

  /**
   * Collect system metrics every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      await this.storeMetrics('system', metrics);
      this.logger.debug('System metrics collected');
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  /**
   * Collect business metrics every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectBusinessMetrics(): Promise<void> {
    try {
      const metrics = await this.getBusinessMetrics();
      await this.storeMetrics('business', metrics);
      this.logger.debug('Business metrics collected');
    } catch (error) {
      this.logger.error('Failed to collect business metrics', error);
    }
  }

  /**
   * Collect database metrics every 2 minutes
   */
  @Cron('*/2 * * * *')
  async collectDatabaseMetrics(): Promise<void> {
    try {
      const metrics = await this.getDatabaseMetrics();
      await this.storeMetrics('database', metrics);
      this.logger.debug('Database metrics collected');
    } catch (error) {
      this.logger.error('Failed to collect database metrics', error);
    }
  }

  /**
   * Get current system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate CPU usage percentage
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / process.uptime() * 100;
    
    // Measure event loop delay
    const eventLoopStart = performance.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopDelay = performance.now() - eventLoopStart;

    // Calculate event loop utilization (Node.js 14+)
    let eventLoopUtilization = 0;
    if (performance.eventLoopUtilization) {
      const elu = performance.eventLoopUtilization();
      eventLoopUtilization = elu.utilization;
    }

    return {
      timestamp: new Date(),
      cpu: {
        usage: Math.min(cpuPercent, 100), // Cap at 100%
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      eventLoop: {
        delay: eventLoopDelay,
        utilization: eventLoopUtilization,
      },
      gc: {
        collections: this.gcStats.collections,
        duration: this.gcStats.duration,
      },
    };
  }

  /**
   * Get current business metrics
   */
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    const timestamp = new Date();
    const timeWindow = new Date(timestamp.getTime() - 5 * 60 * 1000); // Last 5 minutes

    // Decision metrics
    const decisionQuery = `
      SELECT 
        COUNT(*) as total_decisions,
        COUNT(*) FILTER (WHERE recommended_vehicle_id IS NOT NULL) as successful_decisions,
        COUNT(*) FILTER (WHERE recommended_vehicle_id IS NULL AND NOT shadow_mode) as failed_decisions,
        AVG(EXTRACT(EPOCH FROM (updated_at - request_timestamp)) * 1000) as avg_response_time
      FROM decisions 
      WHERE request_timestamp >= $1
    `;

    const decisionResult = await this.connection.query(decisionQuery, [timeWindow]);
    const decisionData = decisionResult[0] || {};

    // Vehicle metrics
    const vehicleQuery = `
      SELECT 
        COUNT(*) as active_vehicles,
        AVG((capacity->>'currentWeight')::numeric / (capacity->>'maxWeight')::numeric * 100) as avg_weight_utilization,
        AVG((capacity->>'currentVolume')::numeric / (capacity->>'maxVolume')::numeric * 100) as avg_volume_utilization
      FROM vehicles 
      WHERE status = 'ACTIVE'
    `;

    const vehicleResult = await this.connection.query(vehicleQuery);
    const vehicleData = vehicleResult[0] || {};

    // Parcel metrics
    const parcelQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_parcels,
        COUNT(*) FILTER (WHERE status = 'IN_TRANSIT') as in_transit_parcels,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered_parcels,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'ASSIGNED', 'IN_TRANSIT') AND sla_deadline <= NOW() + INTERVAL '2 hours') as sla_risk_parcels,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'ASSIGNED', 'IN_TRANSIT') AND sla_deadline <= NOW()) as sla_breached_parcels
      FROM parcels
    `;

    const parcelResult = await this.connection.query(parcelQuery);
    const parcelData = parcelResult[0] || {};

    // Consolidation metrics (from analytics)
    const consolidationQuery = `
      SELECT 
        COALESCE(SUM((metrics->>'vehiclesAvoided')::numeric), 0) as vehicles_avoided,
        COALESCE(AVG((metrics->>'utilizationImprovement')::numeric), 0) as avg_utilization_improvement,
        COALESCE(SUM((metrics->>'emissionsSaved')::numeric), 0) as emissions_saved
      FROM analytics_metrics 
      WHERE metric_date >= $1::date
    `;

    const consolidationResult = await this.connection.query(consolidationQuery, [timeWindow]);
    const consolidationData = consolidationResult[0] || {};

    // Calculate throughput (decisions per minute)
    const totalDecisions = parseInt(decisionData.total_decisions || '0');
    const throughput = totalDecisions / 5; // 5-minute window

    return {
      timestamp,
      decisions: {
        total: totalDecisions,
        successful: parseInt(decisionData.successful_decisions || '0'),
        failed: parseInt(decisionData.failed_decisions || '0'),
        averageResponseTime: parseFloat(decisionData.avg_response_time || '0'),
        throughput,
      },
      vehicles: {
        active: parseInt(vehicleData.active_vehicles || '0'),
        utilization: Math.max(
          parseFloat(vehicleData.avg_weight_utilization || '0'),
          parseFloat(vehicleData.avg_volume_utilization || '0')
        ),
        averageCapacityUsed: parseFloat(vehicleData.avg_weight_utilization || '0'),
      },
      parcels: {
        pending: parseInt(parcelData.pending_parcels || '0'),
        inTransit: parseInt(parcelData.in_transit_parcels || '0'),
        delivered: parseInt(parcelData.delivered_parcels || '0'),
        slaRisk: parseInt(parcelData.sla_risk_parcels || '0'),
        slaBreached: parseInt(parcelData.sla_breached_parcels || '0'),
      },
      consolidation: {
        vehiclesAvoided: parseFloat(consolidationData.vehicles_avoided || '0'),
        utilizationImprovement: parseFloat(consolidationData.avg_utilization_improvement || '0'),
        emissionsSaved: parseFloat(consolidationData.emissions_saved || '0'),
      },
    };
  }

  /**
   * Get current database metrics
   */
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const timestamp = new Date();

    // Database connection metrics
    const connectionQuery = `
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;

    const connectionResult = await this.connection.query(connectionQuery);
    const connectionData = connectionResult[0] || {};

    // Query performance metrics (requires pg_stat_statements extension)
    let queryData = { total_calls: 0, slow_queries: 0, avg_time: 0, max_time: 0 };
    try {
      const queryPerfQuery = `
        SELECT 
          SUM(calls) as total_calls,
          COUNT(*) FILTER (WHERE mean_time > 1000) as slow_queries,
          AVG(mean_time) as avg_time,
          MAX(max_time) as max_time
        FROM pg_stat_statements 
        WHERE last_call >= NOW() - INTERVAL '5 minutes'
      `;

      const queryResult = await this.connection.query(queryPerfQuery);
      queryData = queryResult[0] || queryData;
    } catch (error) {
      // pg_stat_statements might not be available
      this.logger.debug('pg_stat_statements not available for query metrics');
    }

    // Cache metrics (simplified - would need actual cache implementation details)
    const cacheData = {
      hit_rate: 85.5, // Mock data - would come from actual cache metrics
      miss_rate: 14.5,
      evictions: 0,
    };

    const totalConnections = parseInt(connectionData.total_connections || '0');
    const maxConnections = 100; // Would get from database configuration

    return {
      timestamp,
      connections: {
        active: parseInt(connectionData.active_connections || '0'),
        idle: parseInt(connectionData.idle_connections || '0'),
        total: totalConnections,
        utilization: totalConnections > 0 ? (totalConnections / maxConnections) * 100 : 0,
      },
      queries: {
        total: parseInt(queryData.total_calls || '0'),
        slow: parseInt(queryData.slow_queries || '0'),
        averageTime: parseFloat(queryData.avg_time || '0'),
        longestTime: parseFloat(queryData.max_time || '0'),
      },
      cache: {
        hitRate: cacheData.hit_rate,
        missRate: cacheData.miss_rate,
        evictions: cacheData.evictions,
      },
    };
  }

  /**
   * Store metrics in Redis and buffer
   */
  private async storeMetrics(category: string, metrics: any): Promise<void> {
    try {
      const key = `metrics:${category}:${Date.now()}`;
      
      // Store in Redis with TTL
      await this.redis.setex(key, 86400, JSON.stringify(metrics)); // 24 hours TTL
      
      // Add to time series
      await this.addToTimeSeries(category, metrics);
      
      // Store in buffer for real-time access
      this.addToBuffer(category, metrics);
      
    } catch (error) {
      this.logger.error(`Failed to store ${category} metrics`, error);
    }
  }

  /**
   * Add metrics to time series
   */
  private async addToTimeSeries(category: string, metrics: any): Promise<void> {
    const timestamp = metrics.timestamp || new Date();
    
    // Flatten metrics for time series storage
    const flatMetrics = this.flattenMetrics(metrics, category);
    
    for (const [metricName, value] of Object.entries(flatMetrics)) {
      if (typeof value === 'number') {
        const timeSeriesKey = `timeseries:${metricName}`;
        await this.redis.zadd(timeSeriesKey, timestamp.getTime(), JSON.stringify({
          timestamp,
          value,
        }));
        
        // Keep only last 24 hours of data
        const cutoff = timestamp.getTime() - 24 * 60 * 60 * 1000;
        await this.redis.zremrangebyscore(timeSeriesKey, 0, cutoff);
      }
    }
  }

  /**
   * Flatten nested metrics object
   */
  private flattenMetrics(obj: any, prefix: string = ''): Record<string, number> {
    const flattened: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'timestamp') continue;
      
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'number') {
        flattened[newKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(flattened, this.flattenMetrics(value, newKey));
      }
    }
    
    return flattened;
  }

  /**
   * Add metrics to in-memory buffer
   */
  private addToBuffer(category: string, metrics: any): void {
    const timestamp = metrics.timestamp || new Date();
    
    if (!this.metricsBuffer.has(category)) {
      this.metricsBuffer.set(category, []);
    }
    
    const buffer = this.metricsBuffer.get(category)!;
    buffer.push({
      timestamp,
      value: 0, // Would extract relevant value based on category
      tags: { category },
    });
    
    // Keep buffer size manageable
    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }
  }

  /**
   * Get metrics for a time range
   */
  async getMetricsTimeSeries(
    metricName: string,
    startTime: Date,
    endTime: Date
  ): Promise<MetricPoint[]> {
    try {
      const timeSeriesKey = `timeseries:${metricName}`;
      const results = await this.redis.zrangebyscore(
        timeSeriesKey,
        startTime.getTime(),
        endTime.getTime()
      );
      
      return results.map(result => JSON.parse(result));
    } catch (error) {
      this.logger.error(`Failed to get time series for ${metricName}`, error);
      return [];
    }
  }

  /**
   * Get current metrics summary
   */
  async getCurrentMetricsSummary(): Promise<{
    system: SystemMetrics;
    business: BusinessMetrics;
    database: DatabaseMetrics;
  }> {
    const [systemMetrics, businessMetrics, databaseMetrics] = await Promise.all([
      this.getSystemMetrics(),
      this.getBusinessMetrics(),
      this.getDatabaseMetrics(),
    ]);

    return {
      system: systemMetrics,
      business: businessMetrics,
      database: databaseMetrics,
    };
  }

  /**
   * Get metrics dashboard data
   */
  async getDashboardMetrics(timeWindow: string = '1 hour'): Promise<{
    summary: any;
    trends: Record<string, MetricPoint[]>;
    alerts: number;
  }> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeWindow(timeWindow));
    
    const summary = await this.getCurrentMetricsSummary();
    
    // Get trending metrics
    const trendMetrics = [
      'system.cpu.usage',
      'system.memory.percentage',
      'business.decisions.throughput',
      'business.vehicles.utilization',
      'database.connections.utilization',
    ];
    
    const trends: Record<string, MetricPoint[]> = {};
    for (const metric of trendMetrics) {
      trends[metric] = await this.getMetricsTimeSeries(metric, startTime, endTime);
    }
    
    // Get active alerts count (would integrate with AlertingService)
    const alerts = 0; // Placeholder
    
    return {
      summary,
      trends,
      alerts,
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

  /**
   * Record custom metric
   */
  async recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): Promise<void> {
    const point: MetricPoint = {
      timestamp: new Date(),
      value,
      tags,
    };
    
    // Store in time series
    const timeSeriesKey = `timeseries:custom.${name}`;
    await this.redis.zadd(timeSeriesKey, point.timestamp.getTime(), JSON.stringify(point));
    
    // Keep only last 24 hours
    const cutoff = point.timestamp.getTime() - 24 * 60 * 60 * 1000;
    await this.redis.zremrangebyscore(timeSeriesKey, 0, cutoff);
    
    this.logger.debug(`Recorded custom metric: ${name} = ${value}`, tags);
  }

  /**
   * Get performance percentiles for a metric
   */
  async getMetricPercentiles(
    metricName: string,
    timeWindow: string = '1 hour',
    percentiles: number[] = [50, 90, 95, 99]
  ): Promise<Record<string, number>> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeWindow(timeWindow));
    
    const points = await this.getMetricsTimeSeries(metricName, startTime, endTime);
    const values = points.map(p => p.value).sort((a, b) => a - b);
    
    const result: Record<string, number> = {};
    
    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * values.length) - 1;
      result[`p${p}`] = values[Math.max(0, index)] || 0;
    }
    
    return result;
  }
}