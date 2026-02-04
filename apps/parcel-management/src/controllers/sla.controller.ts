import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { SLAService, SLAValidationResult, DeliveryTimeImpact, SLARiskAlert } from '../services/sla.service';
import { GeoCoordinate, ApiResponse as ApiResponseType } from '@pdcp/types';

class SLAValidationRequest {
  parcelId: string;
  currentLocation: GeoCoordinate;
  estimatedRouteDistance: number;
  safetyMarginMinutes?: number;
}

class DeliveryTimeImpactRequest {
  originalRoute: GeoCoordinate[];
  newPickupLocation: GeoCoordinate;
  newDeliveryLocation: GeoCoordinate;
  originalETA: string; // ISO date string
}

@ApiTags('sla')
@Controller('sla')
export class SLAController {
  constructor(private readonly slaService: SLAService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate SLA compliance for parcel assignment' })
  @ApiBody({ type: SLAValidationRequest })
  @ApiResponse({ status: HttpStatus.OK, description: 'SLA validation completed' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  async validateSLA(
    @Body(ValidationPipe) request: SLAValidationRequest,
  ): Promise<ApiResponseType<SLAValidationResult>> {
    const result = await this.slaService.validateSLA(
      request.parcelId,
      request.currentLocation,
      request.estimatedRouteDistance,
      request.safetyMarginMinutes,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date(),
    };
  }

  @Post('delivery-impact')
  @ApiOperation({ summary: 'Calculate delivery time impact of adding parcel to route' })
  @ApiBody({ type: DeliveryTimeImpactRequest })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery time impact calculated' })
  async calculateDeliveryTimeImpact(
    @Body(ValidationPipe) request: DeliveryTimeImpactRequest,
  ): Promise<ApiResponseType<DeliveryTimeImpact>> {
    const result = this.slaService.calculateDeliveryTimeImpact(
      request.originalRoute,
      request.newPickupLocation,
      request.newDeliveryLocation,
      new Date(request.originalETA),
    );

    return {
      success: true,
      data: result,
      timestamp: new Date(),
    };
  }

  @Get('at-risk')
  @ApiOperation({ summary: 'Get parcels at risk of SLA violation' })
  @ApiQuery({ 
    name: 'riskThresholdMinutes', 
    required: false, 
    type: Number, 
    description: 'Risk threshold in minutes (default: 120)' 
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'At-risk parcels retrieved' })
  async getAtRiskParcels(
    @Query('riskThresholdMinutes') riskThresholdMinutes?: number,
  ): Promise<ApiResponseType<SLARiskAlert[]>> {
    const alerts = await this.slaService.getAtRiskParcels(riskThresholdMinutes);

    return {
      success: true,
      data: alerts,
      timestamp: new Date(),
    };
  }

  @Get('compliance-report')
  @ApiOperation({ summary: 'Generate SLA compliance report for date range' })
  @ApiQuery({ name: 'startDate', type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', type: String, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance report generated' })
  async generateComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ApiResponseType<{
    totalParcels: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    complianceRate: number;
    averageDeliveryTime: number;
    riskBreakdown: Record<string, number>;
  }>> {
    const report = await this.slaService.generateSLAComplianceReport(
      new Date(startDate),
      new Date(endDate),
    );

    return {
      success: true,
      data: report,
      timestamp: new Date(),
    };
  }

  @Post('calculate-deadline')
  @ApiOperation({ summary: 'Calculate SLA deadline based on pickup time and service level' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pickupTime: { type: 'string', format: 'date-time' },
        serviceLevel: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'SAME_DAY'] },
      },
      required: ['pickupTime'],
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'SLA deadline calculated' })
  async calculateSLADeadline(
    @Body() request: { 
      pickupTime: string; 
      serviceLevel?: 'STANDARD' | 'EXPRESS' | 'SAME_DAY' 
    },
  ): Promise<ApiResponseType<{ deadline: Date }>> {
    const deadline = this.slaService.calculateSLADeadline(
      new Date(request.pickupTime),
      request.serviceLevel,
    );

    return {
      success: true,
      data: { deadline },
      timestamp: new Date(),
    };
  }

  @Get('parcel/:id/risk-assessment')
  @ApiOperation({ summary: 'Get detailed risk assessment for specific parcel' })
  @ApiParam({ name: 'id', type: String, description: 'Parcel ID' })
  @ApiQuery({ 
    name: 'currentLocation', 
    required: false, 
    description: 'Current vehicle location (lat,lng)' 
  })
  @ApiQuery({ 
    name: 'estimatedDistance', 
    required: false, 
    type: Number, 
    description: 'Estimated route distance in km' 
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Risk assessment completed' })
  async getParcelRiskAssessment(
    @Param('id', ParseUUIDPipe) parcelId: string,
    @Query('currentLocation') currentLocationStr?: string,
    @Query('estimatedDistance') estimatedDistance?: number,
  ): Promise<ApiResponseType<SLAValidationResult>> {
    // Parse current location if provided
    let currentLocation: GeoCoordinate = { latitude: 0, longitude: 0 };
    if (currentLocationStr) {
      const [lat, lng] = currentLocationStr.split(',').map(Number);
      currentLocation = { latitude: lat, longitude: lng };
    }

    const result = await this.slaService.validateSLA(
      parcelId,
      currentLocation,
      estimatedDistance || 10, // Default 10km if not provided
    );

    return {
      success: true,
      data: result,
      timestamp: new Date(),
    };
  }
}