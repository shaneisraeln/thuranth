import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
  ImpactMeasurementDashboard,
  CustomKPIDefinition,
  CustomKPIData,
  KPICalculationRequest,
  TimeRange,
  TimeGranularity,
  KPICategory
} from '../interfaces/advanced-analytics.interfaces';
import { AdvancedAnalyticsService } from '../services/advanced-analytics.service';
import { CustomKPIService } from '../services/custom-kpi.service';
import { CustomKPIEntity } from '../entities/custom-kpi.entity';
import { JwtAuthGuard } from '@pdcp/shared';
import { CurrentUser, Permissions } from '@pdcp/shared';
import { Permission, AuthUser } from '../../../auth-service/src/interfaces/auth.interfaces';

@ApiTags('Advanced Analytics')
@Controller('advanced-analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvancedAnalyticsController {
  constructor(
    private readonly advancedAnalyticsService: AdvancedAnalyticsService,
    private readonly customKPIService: CustomKPIService,
  ) {}

  @Get('dashboard')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get comprehensive impact measurement dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid time range parameters' })
  async getImpactMeasurementDashboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity: TimeGranularity = TimeGranularity.DAY
  ): Promise<ImpactMeasurementDashboard> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity
    };

    // Validate date range
    if (timeRange.start >= timeRange.end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const maxDays = 365; // Maximum 1 year range
    const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      throw new BadRequestException(`Date range cannot exceed ${maxDays} days`);
    }

    return this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
  }

  @Post('custom-kpis')
  @Permissions(Permission.MANAGE_SYSTEM)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new custom KPI definition' })
  @ApiResponse({ status: 201, description: 'Custom KPI created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid KPI definition' })
  async createCustomKPI(
    @Body() definition: CustomKPIDefinition,
    @CurrentUser() user: AuthUser
  ): Promise<CustomKPIEntity> {
    // Set the owner to the current user if not specified
    if (!definition.owner) {
      definition.owner = user.id;
    }

    return this.customKPIService.createCustomKPI(definition);
  }

  @Put('custom-kpis/:id')
  @Permissions(Permission.MANAGE_SYSTEM)
  @ApiOperation({ summary: 'Update an existing custom KPI definition' })
  @ApiResponse({ status: 200, description: 'Custom KPI updated successfully' })
  @ApiResponse({ status: 404, description: 'Custom KPI not found' })
  async updateCustomKPI(
    @Param('id') id: string,
    @Body() definition: Partial<CustomKPIDefinition>
  ): Promise<CustomKPIEntity> {
    return this.customKPIService.updateCustomKPI(id, definition);
  }

  @Delete('custom-kpis/:id')
  @Permissions(Permission.MANAGE_SYSTEM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom KPI definition' })
  @ApiResponse({ status: 204, description: 'Custom KPI deleted successfully' })
  @ApiResponse({ status: 404, description: 'Custom KPI not found' })
  async deleteCustomKPI(@Param('id') id: string): Promise<void> {
    return this.customKPIService.deleteCustomKPI(id);
  }

  @Get('custom-kpis')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get all custom KPIs with optional filtering' })
  @ApiResponse({ status: 200, description: 'Custom KPIs retrieved successfully' })
  async getCustomKPIs(
    @Query('category') category?: KPICategory,
    @Query('owner') owner?: string,
    @Query('isActive') isActive?: boolean
  ): Promise<CustomKPIEntity[]> {
    return this.customKPIService.getCustomKPIs(category, owner, isActive);
  }

  @Get('custom-kpis/:id')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get a specific custom KPI by ID' })
  @ApiResponse({ status: 200, description: 'Custom KPI retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Custom KPI not found' })
  async getCustomKPIById(@Param('id') id: string): Promise<CustomKPIEntity> {
    return this.customKPIService.getCustomKPIById(id);
  }

  @Post('custom-kpis/:id/calculate')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Calculate a custom KPI value for a specific time range' })
  @ApiResponse({ status: 200, description: 'Custom KPI calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid calculation request' })
  @ApiResponse({ status: 404, description: 'Custom KPI not found' })
  async calculateCustomKPI(
    @Param('id') id: string,
    @Body() request: { 
      startDate: string; 
      endDate: string; 
      granularity?: TimeGranularity;
      filters?: Record<string, any>;
    }
  ): Promise<CustomKPIData> {
    if (!request.startDate || !request.endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const calculationRequest: KPICalculationRequest = {
      kpiId: id,
      timeRange: {
        start: new Date(request.startDate),
        end: new Date(request.endDate),
        granularity: request.granularity || TimeGranularity.DAY
      },
      filters: request.filters
    };

    return this.customKPIService.calculateCustomKPI(calculationRequest);
  }

  @Post('custom-kpis/calculate-all')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Calculate all active custom KPIs for a time range' })
  @ApiResponse({ status: 200, description: 'All custom KPIs calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid time range parameters' })
  async calculateAllActiveKPIs(
    @Body() request: { 
      startDate: string; 
      endDate: string; 
      granularity?: TimeGranularity;
    }
  ): Promise<CustomKPIData[]> {
    if (!request.startDate || !request.endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(request.startDate),
      end: new Date(request.endDate),
      granularity: request.granularity || TimeGranularity.DAY
    };

    return this.customKPIService.calculateAllActiveKPIs(timeRange);
  }

  @Get('custom-kpis/:id/history')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get KPI calculation history' })
  @ApiResponse({ status: 200, description: 'KPI history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Custom KPI not found' })
  async getKPIHistory(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<{ timestamp: Date; value: number }[]> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity: granularity as TimeGranularity
    };

    return this.customKPIService.getKPIHistory(id, timeRange, granularity);
  }

  @Get('benchmarking')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get benchmarking data for key metrics' })
  @ApiResponse({ status: 200, description: 'Benchmarking data retrieved successfully' })
  async getBenchmarkingData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('metrics') metrics?: string
  ): Promise<any> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity: TimeGranularity.DAY
    };

    const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
    
    // Filter benchmarking data based on requested metrics
    let benchmarkingData = dashboard.benchmarking;
    
    if (metrics) {
      const requestedMetrics = metrics.split(',').map(m => m.trim());
      benchmarkingData = {
        ...benchmarkingData,
        industryBenchmarks: benchmarkingData.industryBenchmarks.filter(
          benchmark => requestedMetrics.includes(benchmark.metricName)
        )
      };
    }

    return benchmarkingData;
  }

  @Get('trends')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get trend analysis data' })
  @ApiResponse({ status: 200, description: 'Trend analysis data retrieved successfully' })
  async getTrendAnalysis(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('metrics') metrics?: string
  ): Promise<any> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity: TimeGranularity.DAY
    };

    const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
    
    return dashboard.trendAnalysis;
  }

  @Get('financial-impact')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get detailed financial impact analysis' })
  @ApiResponse({ status: 200, description: 'Financial impact data retrieved successfully' })
  async getFinancialImpact(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<any> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity: TimeGranularity.DAY
    };

    const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
    
    return {
      financialImpact: dashboard.financialImpact,
      primaryMetrics: dashboard.primaryMetrics,
      secondaryMetrics: dashboard.secondaryMetrics
    };
  }

  @Get('environmental-impact')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get detailed environmental impact analysis' })
  @ApiResponse({ status: 200, description: 'Environmental impact data retrieved successfully' })
  async getEnvironmentalImpact(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<any> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity: TimeGranularity.DAY
    };

    const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
    
    return dashboard.environmentalImpact;
  }

  @Get('operational-efficiency')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: 'Get operational efficiency metrics' })
  @ApiResponse({ status: 200, description: 'Operational efficiency data retrieved successfully' })
  async getOperationalEfficiency(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<any> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const timeRange: TimeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
      granularity: TimeGranularity.DAY
    };

    const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
    
    return dashboard.operationalEfficiency;
  }
}