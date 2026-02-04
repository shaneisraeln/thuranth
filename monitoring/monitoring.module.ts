/**
 * Monitoring Module
 * 
 * Provides comprehensive monitoring capabilities for the PDCP system,
 * including health checks, metrics collection, alerting, and monitoring APIs.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';

import { HealthCheckService } from './health-check.service';
import { AlertingService } from './alerting.service';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      // Add any entities needed for monitoring
    ]),
    RedisModule.forRootAsync({
      useFactory: () => ({
        config: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_MONITORING_DB || '1'),
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        },
      }),
    }),
  ],
  controllers: [MonitoringController],
  providers: [
    HealthCheckService,
    AlertingService,
    MetricsService,
  ],
  exports: [
    HealthCheckService,
    AlertingService,
    MetricsService,
  ],
})
export class MonitoringModule {}