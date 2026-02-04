/**
 * Health Check Service
 * 
 * Provides comprehensive health monitoring for all PDCP services,
 * including database connectivity, external service availability,
 * and system resource monitoring.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { performance } from 'perf_hooks';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  metrics: SystemMetrics;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  eventLoop: {
    delay: number;
  };
  database: {
    connections: number;
    activeQueries: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
  };
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Perform comprehensive health check
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      const checks = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkExternalServices(),
        this.checkSystemResources(),
        this.checkBusinessLogic(),
      ]);

      const metrics = await this.getSystemMetrics();
      const overallStatus = this.determineOverallStatus(checks);

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: this.configService.get('APP_VERSION', '1.0.0'),
        environment: this.configService.get('NODE_ENV', 'development'),
        checks: checks.flat(),
        metrics,
      };

      const totalTime = performance.now() - startTime;
      this.logger.log(`Health check completed in ${totalTime.toFixed(2)}ms - Status: ${overallStatus}`);

      return healthStatus;
    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: this.configService.get('APP_VERSION', '1.0.0'),
        environment: this.configService.get('NODE_ENV', 'development'),
        checks: [{
          name: 'health-check-service',
          status: 'fail',
          responseTime: performance.now() - startTime,
          message: 'Health check service failed',
          details: { error: error.message },
        }],
        metrics: await this.getBasicMetrics(),
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database connectivity check
    const connectivityStart = performance.now();
    try {
      await this.connection.query('SELECT 1');
      checks.push({
        name: 'database-connectivity',
        status: 'pass',
        responseTime: performance.now() - connectivityStart,
        message: 'Database connection successful',
      });
    } catch (error) {
      checks.push({
        name: 'database-connectivity',
        status: 'fail',
        responseTime: performance.now() - connectivityStart,
        message: 'Database connection failed',
        details: { error: error.message },
      });
    }

    // Database performance check
    const performanceStart = performance.now();
    try {
      await this.connection.query('SELECT COUNT(*) FROM vehicles WHERE status = $1', ['ACTIVE']);
      const responseTime = performance.now() - performanceStart;
      
      checks.push({
        name: 'database-performance',
        status: responseTime < 100 ? 'pass' : responseTime < 500 ? 'warn' : 'fail',
        responseTime,
        message: `Database query completed in ${responseTime.toFixed(2)}ms`,
      });
    } catch (error) {
      checks.push({
        name: 'database-performance',
        status: 'fail',
        responseTime: performance.now() - performanceStart,
        message: 'Database performance check failed',
        details: { error: error.message },
      });
    }

    // Database connection pool check
    try {
      const poolSize = this.connection.driver.master.poolSize;
      const activeConnections = this.connection.driver.master.pool?.totalCount || 0;
      const utilization = (activeConnections / poolSize) * 100;

      checks.push({
        name: 'database-pool',
        status: utilization < 80 ? 'pass' : utilization < 95 ? 'warn' : 'fail',
        responseTime: 0,
        message: `Connection pool utilization: ${utilization.toFixed(1)}%`,
        details: {
          poolSize,
          activeConnections,
          utilization: utilization.toFixed(1),
        },
      });
    } catch (error) {
      checks.push({
        name: 'database-pool',
        status: 'warn',
        responseTime: 0,
        message: 'Could not check database pool status',
        details: { error: error.message },
      });
    }

    return checks;
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedis(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Redis connectivity check
    const connectivityStart = performance.now();
    try {
      await this.redis.ping();
      checks.push({
        name: 'redis-connectivity',
        status: 'pass',
        responseTime: performance.now() - connectivityStart,
        message: 'Redis connection successful',
      });
    } catch (error) {
      checks.push({
        name: 'redis-connectivity',
        status: 'fail',
        responseTime: performance.now() - connectivityStart,
        message: 'Redis connection failed',
        details: { error: error.message },
      });
    }

    // Redis performance check
    const performanceStart = performance.now();
    try {
      const testKey = `health-check:${Date.now()}`;
      await this.redis.set(testKey, 'test-value', 'EX', 10);
      await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      const responseTime = performance.now() - performanceStart;
      checks.push({
        name: 'redis-performance',
        status: responseTime < 50 ? 'pass' : responseTime < 200 ? 'warn' : 'fail',
        responseTime,
        message: `Redis operations completed in ${responseTime.toFixed(2)}ms`,
      });
    } catch (error) {
      checks.push({
        name: 'redis-performance',
        status: 'fail',
        responseTime: performance.now() - performanceStart,
        message: 'Redis performance check failed',
        details: { error: error.message },
      });
    }

    // Redis memory usage check
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const maxMemoryMatch = info.match(/maxmemory:(\d+)/);
      
      if (memoryMatch && maxMemoryMatch) {
        const usedMemory = parseInt(memoryMatch[1]);
        const maxMemory = parseInt(maxMemoryMatch[1]);
        const utilization = (usedMemory / maxMemory) * 100;

        checks.push({
          name: 'redis-memory',
          status: utilization < 80 ? 'pass' : utilization < 95 ? 'warn' : 'fail',
          responseTime: 0,
          message: `Redis memory utilization: ${utilization.toFixed(1)}%`,
          details: {
            usedMemory,
            maxMemory,
            utilization: utilization.toFixed(1),
          },
        });
      }
    } catch (error) {
      checks.push({
        name: 'redis-memory',
        status: 'warn',
        responseTime: 0,
        message: 'Could not check Redis memory usage',
        details: { error: error.message },
      });
    }

    return checks;
  }

  /**
   * Check external service availability
   */
  private async checkExternalServices(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Google Maps API check
    const mapsStart = performance.now();
    try {
      const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
      if (apiKey && apiKey !== 'test-google-maps-api-key') {
        const response = await firstValueFrom(
          this.httpService.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
              address: 'Bangalore, India',
              key: apiKey,
            },
            timeout: 5000,
          })
        );

        checks.push({
          name: 'google-maps-api',
          status: response.status === 200 ? 'pass' : 'warn',
          responseTime: performance.now() - mapsStart,
          message: `Google Maps API responded with status ${response.status}`,
        });
      } else {
        checks.push({
          name: 'google-maps-api',
          status: 'warn',
          responseTime: 0,
          message: 'Google Maps API key not configured',
        });
      }
    } catch (error) {
      checks.push({
        name: 'google-maps-api',
        status: 'fail',
        responseTime: performance.now() - mapsStart,
        message: 'Google Maps API check failed',
        details: { error: error.message },
      });
    }

    // Firebase Auth check (if configured)
    const firebaseStart = performance.now();
    try {
      const projectId = this.configService.get('FIREBASE_PROJECT_ID');
      if (projectId && projectId !== 'pdcp-test') {
        // Simple Firebase project check
        const response = await firstValueFrom(
          this.httpService.get(`https://firebase.googleapis.com/v1beta1/projects/${projectId}`, {
            timeout: 5000,
          })
        );

        checks.push({
          name: 'firebase-auth',
          status: response.status === 200 ? 'pass' : 'warn',
          responseTime: performance.now() - firebaseStart,
          message: `Firebase Auth service responded with status ${response.status}`,
        });
      } else {
        checks.push({
          name: 'firebase-auth',
          status: 'warn',
          responseTime: 0,
          message: 'Firebase Auth not configured for production',
        });
      }
    } catch (error) {
      checks.push({
        name: 'firebase-auth',
        status: 'fail',
        responseTime: performance.now() - firebaseStart,
        message: 'Firebase Auth check failed',
        details: { error: error.message },
      });
    }

    // Blockchain network check
    const blockchainStart = performance.now();
    try {
      const networkType = this.configService.get('BLOCKCHAIN_NETWORK', 'test');
      if (networkType !== 'test') {
        const endpoint = this.configService.get('HYPERLEDGER_FABRIC_ENDPOINT') || 
                        this.configService.get('POLYGON_EDGE_ENDPOINT');
        
        if (endpoint) {
          const response = await firstValueFrom(
            this.httpService.get(`${endpoint}/health`, {
              timeout: 5000,
            })
          );

          checks.push({
            name: 'blockchain-network',
            status: response.status === 200 ? 'pass' : 'warn',
            responseTime: performance.now() - blockchainStart,
            message: `Blockchain network responded with status ${response.status}`,
          });
        } else {
          checks.push({
            name: 'blockchain-network',
            status: 'warn',
            responseTime: 0,
            message: 'Blockchain network endpoint not configured',
          });
        }
      } else {
        checks.push({
          name: 'blockchain-network',
          status: 'pass',
          responseTime: 0,
          message: 'Using test blockchain network',
        });
      }
    } catch (error) {
      checks.push({
        name: 'blockchain-network',
        status: 'fail',
        responseTime: performance.now() - blockchainStart,
        message: 'Blockchain network check failed',
        details: { error: error.message },
      });
    }

    return checks;
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    checks.push({
      name: 'memory-usage',
      status: memoryUtilization < 80 ? 'pass' : memoryUtilization < 95 ? 'warn' : 'fail',
      responseTime: 0,
      message: `Memory utilization: ${memoryUtilization.toFixed(1)}%`,
      details: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        utilization: memoryUtilization.toFixed(1),
      },
    });

    // Event loop delay check
    const eventLoopStart = performance.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopDelay = performance.now() - eventLoopStart;

    checks.push({
      name: 'event-loop-delay',
      status: eventLoopDelay < 10 ? 'pass' : eventLoopDelay < 50 ? 'warn' : 'fail',
      responseTime: eventLoopDelay,
      message: `Event loop delay: ${eventLoopDelay.toFixed(2)}ms`,
    });

    return checks;
  }

  /**
   * Check business logic health
   */
  private async checkBusinessLogic(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Decision engine health check
    const decisionStart = performance.now();
    try {
      // Simple decision engine test
      const activeVehicles = await this.connection.query(
        'SELECT COUNT(*) as count FROM vehicles WHERE status = $1',
        ['ACTIVE']
      );
      
      const pendingParcels = await this.connection.query(
        'SELECT COUNT(*) as count FROM parcels WHERE status = $1',
        ['PENDING']
      );

      const vehicleCount = parseInt(activeVehicles[0].count);
      const parcelCount = parseInt(pendingParcels[0].count);

      checks.push({
        name: 'decision-engine-data',
        status: 'pass',
        responseTime: performance.now() - decisionStart,
        message: `${vehicleCount} active vehicles, ${parcelCount} pending parcels`,
        details: {
          activeVehicles: vehicleCount,
          pendingParcels: parcelCount,
        },
      });
    } catch (error) {
      checks.push({
        name: 'decision-engine-data',
        status: 'fail',
        responseTime: performance.now() - decisionStart,
        message: 'Decision engine data check failed',
        details: { error: error.message },
      });
    }

    // SLA monitoring check
    const slaStart = performance.now();
    try {
      const slaRisks = await this.connection.query(`
        SELECT COUNT(*) as count 
        FROM parcels 
        WHERE status IN ('PENDING', 'ASSIGNED') 
        AND sla_deadline < NOW() + INTERVAL '2 hours'
      `);

      const riskCount = parseInt(slaRisks[0].count);

      checks.push({
        name: 'sla-monitoring',
        status: riskCount === 0 ? 'pass' : riskCount < 10 ? 'warn' : 'fail',
        responseTime: performance.now() - slaStart,
        message: `${riskCount} parcels at SLA risk`,
        details: {
          slaRiskParcels: riskCount,
        },
      });
    } catch (error) {
      checks.push({
        name: 'sla-monitoring',
        status: 'fail',
        responseTime: performance.now() - slaStart,
        message: 'SLA monitoring check failed',
        details: { error: error.message },
      });
    }

    return checks;
  }

  /**
   * Get comprehensive system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate CPU usage percentage (simplified)
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / (process.uptime() * 1000) * 100;

    // Event loop delay measurement
    const eventLoopStart = performance.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopDelay = performance.now() - eventLoopStart;

    // Database metrics
    let dbConnections = 0;
    let activeQueries = 0;
    try {
      const dbStats = await this.connection.query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
          (SELECT count(*) FROM pg_stat_activity) as total_connections
      `);
      activeQueries = parseInt(dbStats[0].active_queries);
      dbConnections = parseInt(dbStats[0].total_connections);
    } catch (error) {
      this.logger.warn('Could not fetch database metrics', error);
    }

    // Cache metrics (simplified)
    let cacheHitRate = 0;
    let cacheMemoryUsage = 0;
    try {
      const cacheInfo = await this.redis.info('stats');
      const hitsMatch = cacheInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = cacheInfo.match(/keyspace_misses:(\d+)/);
      
      if (hitsMatch && missesMatch) {
        const hits = parseInt(hitsMatch[1]);
        const misses = parseInt(missesMatch[1]);
        cacheHitRate = hits / (hits + misses) * 100;
      }

      const memoryInfo = await this.redis.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        cacheMemoryUsage = parseInt(memoryMatch[1]);
      }
    } catch (error) {
      this.logger.warn('Could not fetch cache metrics', error);
    }

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        usage: Math.min(cpuPercent, 100), // Cap at 100%
      },
      eventLoop: {
        delay: eventLoopDelay,
      },
      database: {
        connections: dbConnections,
        activeQueries,
      },
      cache: {
        hitRate: cacheHitRate,
        memoryUsage: cacheMemoryUsage,
      },
    };
  }

  /**
   * Get basic metrics when full metrics fail
   */
  private async getBasicMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        usage: 0,
      },
      eventLoop: {
        delay: 0,
      },
      database: {
        connections: 0,
        activeQueries: 0,
      },
      cache: {
        hitRate: 0,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Determine overall health status based on individual checks
   */
  private determineOverallStatus(checkGroups: HealthCheck[][]): 'healthy' | 'degraded' | 'unhealthy' {
    const allChecks = checkGroups.flat();
    
    const failedChecks = allChecks.filter(check => check.status === 'fail');
    const warnChecks = allChecks.filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      // Check if critical services are failing
      const criticalFailures = failedChecks.filter(check => 
        ['database-connectivity', 'redis-connectivity'].includes(check.name)
      );
      
      if (criticalFailures.length > 0) {
        return 'unhealthy';
      }
      
      // Non-critical failures result in degraded status
      return 'degraded';
    }

    if (warnChecks.length > 2) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get health check summary for quick status
   */
  async getHealthSummary(): Promise<{
    status: string;
    uptime: number;
    timestamp: Date;
    criticalIssues: number;
    warnings: number;
  }> {
    try {
      const fullHealth = await this.getHealthStatus();
      const criticalIssues = fullHealth.checks.filter(check => check.status === 'fail').length;
      const warnings = fullHealth.checks.filter(check => check.status === 'warn').length;

      return {
        status: fullHealth.status,
        uptime: fullHealth.uptime,
        timestamp: fullHealth.timestamp,
        criticalIssues,
        warnings,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: Date.now() - this.startTime,
        timestamp: new Date(),
        criticalIssues: 1,
        warnings: 0,
      };
    }
  }
}