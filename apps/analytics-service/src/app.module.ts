import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';
import { AnalyticsMetricEntity } from './entities/analytics-metric.entity';
import { DailyMetricsSummaryEntity } from './entities/daily-metrics-summary.entity';
import { CustomKPIEntity } from './entities/custom-kpi.entity';
import { MetricsCalculatorService } from './services/metrics-calculator.service';
import { ReportingService } from './services/reporting.service';
import { AdvancedAnalyticsService } from './services/advanced-analytics.service';
import { CustomKPIService } from './services/custom-kpi.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { ReportingController } from './controllers/reporting.controller';
import { AdvancedAnalyticsController } from './controllers/advanced-analytics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([AnalyticsMetricEntity, DailyMetricsSummaryEntity, CustomKPIEntity]),
  ],
  controllers: [AnalyticsController, ReportingController, AdvancedAnalyticsController],
  providers: [MetricsCalculatorService, ReportingService, AdvancedAnalyticsService, CustomKPIService],
  exports: [MetricsCalculatorService, ReportingService, AdvancedAnalyticsService, CustomKPIService],
})
export class AppModule {}