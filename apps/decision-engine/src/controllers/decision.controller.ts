import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DecisionRequest, DecisionResponse, Vehicle } from '@pdcp/types';
import { DecisionEngineService } from '../services/decision-engine.service';
import { ShadowModeService } from '../services/shadow-mode.service';

@ApiTags('Decision Engine')
@Controller('decisions')
export class DecisionController {
  private readonly logger = new Logger(DecisionController.name);

  constructor(
    private readonly decisionEngine: DecisionEngineService,
    private readonly shadowModeService: ShadowModeService,
  ) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate parcel assignment against available vehicles' })
  @ApiBody({ type: Object, description: 'Decision request with parcel details and available vehicles' })
  @ApiResponse({ status: 200, description: 'Decision response with recommendation' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async evaluateParcelAssignment(
    @Body() body: { request: DecisionRequest; availableVehicles: Vehicle[]; shadowMode?: boolean },
  ): Promise<DecisionResponse> {
    try {
      const { request, availableVehicles, shadowMode = false } = body;

      if (!request || !availableVehicles) {
        throw new HttpException('Missing required fields: request and availableVehicles', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Evaluating parcel assignment for ${request.parcelId} with ${availableVehicles.length} vehicles`);

      const decision = await this.decisionEngine.evaluateParcelAssignment(
        request,
        availableVehicles,
        shadowMode,
      );

      return decision;
    } catch (error) {
      this.logger.error('Error evaluating parcel assignment:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('history/:parcelId')
  @ApiOperation({ summary: 'Get decision history for a parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiResponse({ status: 200, description: 'Decision history retrieved' })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  async getDecisionHistory(@Param('parcelId') parcelId: string) {
    try {
      const history = await this.decisionEngine.getDecisionHistory(parcelId);
      return { parcelId, history };
    } catch (error) {
      this.logger.error(`Error retrieving decision history for parcel ${parcelId}:`, error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('execute/:decisionId')
  @ApiOperation({ summary: 'Mark a decision as executed' })
  @ApiParam({ name: 'decisionId', description: 'Decision ID' })
  @ApiResponse({ status: 200, description: 'Decision marked as executed' })
  @ApiResponse({ status: 404, description: 'Decision not found' })
  async markDecisionExecuted(@Param('decisionId') decisionId: string) {
    try {
      await this.decisionEngine.markDecisionExecuted(decisionId);
      return { message: 'Decision marked as executed', decisionId };
    } catch (error) {
      this.logger.error(`Error marking decision ${decisionId} as executed:`, error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('override/:decisionId')
  @ApiOperation({ summary: 'Record a manual override for a decision' })
  @ApiParam({ name: 'decisionId', description: 'Decision ID' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        reason: { type: 'string' }, 
        userId: { type: 'string' } 
      },
      required: ['reason', 'userId']
    } 
  })
  @ApiResponse({ status: 200, description: 'Override recorded' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async recordManualOverride(
    @Param('decisionId') decisionId: string,
    @Body() body: { reason: string; userId: string },
  ) {
    try {
      const { reason, userId } = body;

      if (!reason || !userId) {
        throw new HttpException('Missing required fields: reason and userId', HttpStatus.BAD_REQUEST);
      }

      await this.decisionEngine.recordManualOverride(decisionId, reason, userId);
      return { message: 'Manual override recorded', decisionId, reason, userId };
    } catch (error) {
      this.logger.error(`Error recording override for decision ${decisionId}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Shadow Mode Endpoints

  @Get('shadow/config')
  @ApiOperation({ summary: 'Get shadow mode configuration' })
  @ApiResponse({ status: 200, description: 'Shadow mode configuration' })
  getShadowModeConfig() {
    return this.shadowModeService.getConfig();
  }

  @Post('shadow/config')
  @ApiOperation({ summary: 'Update shadow mode configuration' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        enabled: { type: 'boolean' },
        comparisonEnabled: { type: 'boolean' },
        logAllDecisions: { type: 'boolean' },
        validationThreshold: { type: 'number' }
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  updateShadowModeConfig(@Body() config: any) {
    this.shadowModeService.updateConfig(config);
    return { message: 'Shadow mode configuration updated', config: this.shadowModeService.getConfig() };
  }

  @Post('shadow/enable')
  @ApiOperation({ summary: 'Enable shadow mode' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        comparisonEnabled: { type: 'boolean', default: false }
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Shadow mode enabled' })
  enableShadowMode(@Body() body: { comparisonEnabled?: boolean } = {}) {
    this.shadowModeService.enableShadowMode(body.comparisonEnabled || false);
    return { message: 'Shadow mode enabled', config: this.shadowModeService.getConfig() };
  }

  @Post('shadow/disable')
  @ApiOperation({ summary: 'Disable shadow mode' })
  @ApiResponse({ status: 200, description: 'Shadow mode disabled' })
  disableShadowMode() {
    this.shadowModeService.disableShadowMode();
    return { message: 'Shadow mode disabled', config: this.shadowModeService.getConfig() };
  }

  @Get('shadow/history')
  @ApiOperation({ summary: 'Get shadow mode decision history' })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Filter by parcel ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', type: Number })
  @ApiResponse({ status: 200, description: 'Shadow decision history' })
  async getShadowDecisionHistory(
    @Query('parcelId') parcelId?: string,
    @Query('limit') limit: number = 100,
  ) {
    try {
      const history = await this.shadowModeService.getShadowDecisionHistory(parcelId, limit);
      return { parcelId, history };
    } catch (error) {
      this.logger.error('Error retrieving shadow decision history:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('shadow/compare')
  @ApiOperation({ summary: 'Compare shadow and production decisions' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        request: { type: 'object' },
        shadowDecision: { type: 'object' },
        productionDecision: { type: 'object' }
      },
      required: ['request', 'shadowDecision', 'productionDecision']
    } 
  })
  @ApiResponse({ status: 200, description: 'Decision comparison result' })
  async compareDecisions(@Body() body: { 
    request: DecisionRequest; 
    shadowDecision: DecisionResponse; 
    productionDecision: DecisionResponse 
  }) {
    try {
      const { request, shadowDecision, productionDecision } = body;

      if (!request || !shadowDecision || !productionDecision) {
        throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
      }

      const comparison = await this.shadowModeService.compareDecisions(
        request,
        shadowDecision,
        productionDecision,
      );

      return comparison;
    } catch (error) {
      this.logger.error('Error comparing decisions:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('shadow/validate/:parcelId')
  @ApiOperation({ summary: 'Validate shadow decisions for a parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiQuery({ name: 'timeRangeHours', required: false, description: 'Time range in hours', type: Number })
  @ApiResponse({ status: 200, description: 'Validation results' })
  async validateShadowDecisions(
    @Param('parcelId') parcelId: string,
    @Query('timeRangeHours') timeRangeHours: number = 24,
  ) {
    try {
      const validation = await this.shadowModeService.validateShadowDecisions(parcelId, timeRangeHours);
      return { parcelId, timeRangeHours, validation };
    } catch (error) {
      this.logger.error(`Error validating shadow decisions for parcel ${parcelId}:`, error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('shadow/performance-report')
  @ApiOperation({ summary: 'Generate shadow mode performance report' })
  @ApiQuery({ name: 'timeRangeHours', required: false, description: 'Time range in hours', type: Number })
  @ApiResponse({ status: 200, description: 'Performance report' })
  async generatePerformanceReport(@Query('timeRangeHours') timeRangeHours: number = 24) {
    try {
      const report = await this.shadowModeService.generatePerformanceReport(timeRangeHours);
      return { timeRangeHours, report };
    } catch (error) {
      this.logger.error('Error generating performance report:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}