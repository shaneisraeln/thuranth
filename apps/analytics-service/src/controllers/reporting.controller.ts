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
import { ReportingService, ImpactReportRequest } from '../services/reporting.service';
import { CustomMetricDefinition } from '../interfaces/analytics.interfaces';

@ApiTags('reporting')
@Controller('reporting')
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Generate comprehensive analytics report' })
  @ApiResponse({ status: 200, description: 'Analytics report generated successfully' })
  async generateAnalyticsReport(
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

      const report = await this.reportingService.generateAnalyticsReport(start, end);
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate analytics report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('impact')
  @ApiOperation({ summary: 'Generate impact report with trend analysis' })
  @ApiResponse({ status: 200, description: 'Impact report generated successfully' })
  async generateImpactReport(@Body() request: ImpactReportRequest) {
    try {
      const report = await this.reportingService.generateImpactReport(request);
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate impact report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('custom-metrics/define')
  @ApiOperation({ summary: 'Define a custom metric' })
  @ApiResponse({ status: 201, description: 'Custom metric defined successfully' })
  async defineCustomMetric(@Body() definition: CustomMetricDefinition) {
    try {
      await this.reportingService.defineCustomMetric(definition);
      return {
        success: true,
        message: `Custom metric '${definition.name}' defined successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to define custom metric: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('custom-metrics/:metricName')
  @ApiOperation({ summary: 'Calculate custom metric value' })
  @ApiResponse({ status: 200, description: 'Custom metric calculated successfully' })
  async calculateCustomMetric(
    @Param('metricName') metricName: string,
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

      const value = await this.reportingService.calculateCustomMetric(metricName, start, end);
      return {
        success: true,
        data: {
          metricName,
          value,
          period: { start, end },
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate custom metric: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('audit')
  @ApiOperation({ summary: 'Generate audit report for specified period' })
  @ApiResponse({ status: 200, description: 'Audit report generated successfully' })
  async generateAuditReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('eventTypes') eventTypes?: string,
    @Query('entityTypes') entityTypes?: string,
    @Query('userIds') userIds?: string,
    @Query('includeEventData') includeEventData?: boolean,
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

      // This would typically call the audit service
      // For now, return a placeholder response
      const report = {
        period: { start, end },
        totalEvents: 0,
        eventsByType: {},
        eventsByUser: {},
        eventsByService: {},
        timeline: [],
        events: includeEventData ? [] : undefined,
      };

      return {
        success: true,
        data: report,
        message: 'Audit report functionality requires integration with audit service',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate audit report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}