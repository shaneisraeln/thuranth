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
import { MetricsCalculatorService } from '../services/metrics-calculator.service';
import { 
  MetricRequest, 
  MetricFilter, 
  ConsolidationEvent,
  VehicleUtilizationData,
  SLAPerformanceData,
  DecisionPerformanceData,
  EmissionsCalculationParams,
} from '../interfaces/analytics.interfaces';

@ApiTags('analytics')
@Controller('analytics')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly metricsCalculatorService: MetricsCalculatorService) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Record a metric' })
  @ApiResponse({ status: 201, description: 'Metric recorded successfully' })
  async recordMetric(@Body() request: MetricRequest) {
    try {
      const metric = await this.metricsCalculatorService.recordMetric(request);
      return {
        success: true,
        data: { id: metric.id },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to record metric: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('consolidation')
  @ApiOperation({ summary: 'Record a consolidation event' })
  @ApiResponse({ status: 201, description: 'Consolidation event recorded successfully' })
  async recordConsolidationEvent(@Body() event: ConsolidationEvent) {
    try {
      await this.metricsCalculatorService.recordConsolidationEvent(event);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to record consolidation event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('utilization')
  @ApiOperation({ summary: 'Record vehicle utilization data' })
  @ApiResponse({ status: 201, description: 'Vehicle utilization recorded successfully' })
  async recordVehicleUtilization(@Body() data: VehicleUtilizationData) {
    try {
      await this.metricsCalculatorService.recordVehicleUtilization(data);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to record vehicle utilization: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sla-performance')
  @ApiOperation({ summary: 'Record SLA performance data' })
  @ApiResponse({ status: 201, description: 'SLA performance recorded successfully' })
  async recordSLAPerformance(@Body() data: SLAPerformanceData) {
    try {
      await this.metricsCalculatorService.recordSLAPerformance(data);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to record SLA performance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('decision-performance')
  @ApiOperation({ summary: 'Record decision engine performance data' })
  @ApiResponse({ status: 201, description: 'Decision performance recorded successfully' })
  async recordDecisionPerformance(@Body() data: DecisionPerformanceData) {
    try {
      await this.metricsCalculatorService.recordDecisionPerformance(data);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to record decision performance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('emissions/calculate')
  @ApiOperation({ summary: 'Calculate carbon emissions for a consolidation event' })
  @ApiResponse({ status: 200, description: 'Emissions calculated successfully' })
  calculateEmissions(@Body() params: EmissionsCalculationParams) {
    try {
      const result = this.metricsCalculatorService.calculateEmissions(params);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate emissions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get metrics with filtering' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(
    @Query('metricName') metricName?: string,
    @Query('metricType') metricType?: string,
    @Query('serviceName') serviceName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const filter: MetricFilter = {
        metricName,
        metricType,
        serviceName,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
      };

      const metrics = await this.metricsCalculatorService.getMetrics(filter);
      return {
        success: true,
        data: metrics,
        count: metrics.length,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('daily-summary/:date')
  @ApiOperation({ summary: 'Calculate daily metrics summary for a specific date' })
  @ApiResponse({ status: 200, description: 'Daily summary calculated successfully' })
  async calculateDailySummary(@Param('date') dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
      }

      const summary = await this.metricsCalculatorService.calculateDailySummary(date);
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate daily summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('daily-summaries')
  @ApiOperation({ summary: 'Get daily summaries for a date range' })
  @ApiResponse({ status: 200, description: 'Daily summaries retrieved successfully' })
  async getDailySummaries(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      if (!startDate || !endDate) {
        throw new HttpException('Start date and end date are required', HttpStatus.BAD_REQUEST);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
      }

      const summaries = await this.metricsCalculatorService.getDailySummaries(start, end);
      return {
        success: true,
        data: summaries,
        count: summaries.length,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve daily summaries: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}