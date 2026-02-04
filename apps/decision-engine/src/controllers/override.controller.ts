import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
  OverrideRequest,
  OverrideResponse,
  OverrideImpactAssessment
} from '../interfaces/override.interfaces';
import { OverrideAuthorizationService } from '../services/override-authorization.service';
import { OverrideImpactService } from '../services/override-impact.service';
import { DecisionEngineService } from '../services/decision-engine.service';
import { JwtAuthGuard } from '@pdcp/shared';
import { CurrentUser, Permissions } from '@pdcp/shared';
import { Permission, AuthUser } from '../../../auth-service/src/interfaces/auth.interfaces';

@ApiTags('Override Management')
@Controller('overrides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OverrideController {
  constructor(
    private readonly overrideAuthService: OverrideAuthorizationService,
    private readonly overrideImpactService: OverrideImpactService,
    private readonly decisionEngineService: DecisionEngineService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @Permissions(Permission.OVERRIDE_DECISIONS)
  @ApiOperation({ summary: 'Request manual override for a decision' })
  @ApiResponse({ status: 201, description: 'Override request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid override request' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async requestOverride(
    @Body() overrideRequest: OverrideRequest,
    @CurrentUser() user: AuthUser
  ): Promise<OverrideResponse> {
    // Validate the override request
    if (!overrideRequest.decisionId || !overrideRequest.reason || !overrideRequest.justification) {
      throw new BadRequestException('Decision ID, reason, and justification are required');
    }

    // Set the requesting user
    overrideRequest.requestedBy = user.id;

    // Validate that the decision exists
    const decisionHistory = await this.decisionEngineService.getDecisionHistory(overrideRequest.parcelId);
    const targetDecision = decisionHistory.find(d => d.id === overrideRequest.decisionId);
    
    if (!targetDecision) {
      throw new NotFoundException('Decision not found');
    }

    // If impact assessment is not provided, generate it
    if (!overrideRequest.impactAssessment) {
      // This would typically fetch the actual parcel, vehicle, and affected parcels data
      // For now, we'll skip the impact assessment generation in the controller
      // and let the authorization service handle it
    }

    return this.overrideAuthService.initiateOverrideAuthorization(overrideRequest);
  }

  @Post(':overrideId/assess-impact')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.OVERRIDE_DECISIONS)
  @ApiOperation({ summary: 'Generate impact assessment for override request' })
  @ApiResponse({ status: 200, description: 'Impact assessment generated successfully' })
  @ApiResponse({ status: 404, description: 'Override request not found' })
  async assessImpact(
    @Param('overrideId') overrideId: string,
    @CurrentUser() user: AuthUser
  ): Promise<OverrideImpactAssessment> {
    const override = await this.overrideAuthService.getOverrideById(overrideId);
    
    if (!override) {
      throw new NotFoundException('Override request not found');
    }

    // This would typically fetch the actual data needed for impact assessment
    // For now, we'll return the existing impact assessment or generate a placeholder
    if (override.impactAssessment) {
      return override.impactAssessment;
    }

    // Generate new impact assessment
    // This is a placeholder - in real implementation, we'd fetch actual data
    const mockDecisionRequest = {
      parcelId: override.parcelId,
      pickupLocation: { latitude: 0, longitude: 0 },
      deliveryLocation: { latitude: 0, longitude: 0 },
      slaDeadline: new Date(),
      weight: 1,
      dimensions: { length: 10, width: 10, height: 10 },
      priority: 'medium' as any
    };

    const mockVehicle = {
      id: override.requestedVehicleId || 'mock-vehicle',
      type: '4W' as any,
      capacity: {
        maxWeight: 1000,
        maxVolume: 1000,
        currentWeight: 500,
        currentVolume: 500,
        utilizationPercentage: 50
      },
      currentRoute: []
    };

    const mockAffectedParcels: any[] = [];

    return this.overrideImpactService.assessOverrideImpact(
      override,
      mockDecisionRequest,
      mockVehicle,
      mockAffectedParcels
    );
  }

  @Put(':overrideId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.OVERRIDE_DECISIONS)
  @ApiOperation({ summary: 'Approve or reject an override request' })
  @ApiResponse({ status: 200, description: 'Override approval processed successfully' })
  @ApiResponse({ status: 404, description: 'Override request not found' })
  async processApproval(
    @Param('overrideId') overrideId: string,
    @Body() approvalData: { approved: boolean; comments?: string },
    @CurrentUser() user: AuthUser
  ): Promise<OverrideResponse> {
    return this.overrideAuthService.processApproval(
      overrideId,
      user.id,
      approvalData.approved,
      approvalData.comments
    );
  }

  @Put(':overrideId/execute')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.OVERRIDE_DECISIONS)
  @ApiOperation({ summary: 'Execute an approved override' })
  @ApiResponse({ status: 200, description: 'Override executed successfully' })
  @ApiResponse({ status: 400, description: 'Override cannot be executed' })
  @ApiResponse({ status: 404, description: 'Override request not found' })
  async executeOverride(
    @Param('overrideId') overrideId: string,
    @CurrentUser() user: AuthUser
  ): Promise<{ message: string }> {
    await this.overrideAuthService.executeOverride(overrideId, user.id);
    
    // Record the manual override in the decision engine
    const override = await this.overrideAuthService.getOverrideById(overrideId);
    if (override) {
      await this.decisionEngineService.recordManualOverride(
        override.decisionId,
        override.reason,
        user.id
      );
    }

    return { message: 'Override executed successfully' };
  }

  @Get('pending')
  @Permissions(Permission.OVERRIDE_DECISIONS)
  @ApiOperation({ summary: 'Get pending overrides for current user role' })
  @ApiResponse({ status: 200, description: 'Pending overrides retrieved successfully' })
  async getPendingOverrides(
    @CurrentUser() user: AuthUser
  ): Promise<any[]> {
    const pendingOverrides = await this.overrideAuthService.getPendingOverridesForApprover(user.role);
    
    return pendingOverrides.map(override => ({
      id: override.id,
      decisionId: override.decisionId,
      parcelId: override.parcelId,
      reason: override.reason,
      justification: override.justification,
      riskLevel: override.riskLevel,
      bypassesSLA: override.bypassesSLA,
      requestedBy: override.requestedBy,
      createdAt: override.createdAt,
      expiresAt: override.expiresAt,
      approvalChain: override.approvalChain,
      impactAssessment: override.impactAssessment
    }));
  }

  @Get(':overrideId')
  @Permissions(Permission.VIEW_DECISIONS)
  @ApiOperation({ summary: 'Get override request details' })
  @ApiResponse({ status: 200, description: 'Override details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Override request not found' })
  async getOverrideDetails(
    @Param('overrideId') overrideId: string
  ): Promise<any> {
    const override = await this.overrideAuthService.getOverrideById(overrideId);
    
    if (!override) {
      throw new NotFoundException('Override request not found');
    }

    return {
      id: override.id,
      decisionId: override.decisionId,
      parcelId: override.parcelId,
      requestedVehicleId: override.requestedVehicleId,
      reason: override.reason,
      justification: override.justification,
      riskLevel: override.riskLevel,
      status: override.status,
      bypassesSLA: override.bypassesSLA,
      requestedBy: override.requestedBy,
      approvalChain: override.approvalChain,
      impactAssessment: override.impactAssessment,
      approvedBy: override.approvedBy,
      approvedAt: override.approvedAt,
      rejectedBy: override.rejectedBy,
      rejectedAt: override.rejectedAt,
      rejectionReason: override.rejectionReason,
      executedAt: override.executedAt,
      expiresAt: override.expiresAt,
      createdAt: override.createdAt,
      updatedAt: override.updatedAt
    };
  }

  @Get('decision/:decisionId')
  @Permissions(Permission.VIEW_DECISIONS)
  @ApiOperation({ summary: 'Get all overrides for a specific decision' })
  @ApiResponse({ status: 200, description: 'Decision overrides retrieved successfully' })
  async getOverridesForDecision(
    @Param('decisionId') decisionId: string
  ): Promise<any[]> {
    const overrides = await this.overrideAuthService.getOverridesForDecision(decisionId);
    
    return overrides.map(override => ({
      id: override.id,
      reason: override.reason,
      status: override.status,
      riskLevel: override.riskLevel,
      requestedBy: override.requestedBy,
      createdAt: override.createdAt,
      approvedAt: override.approvedAt,
      executedAt: override.executedAt
    }));
  }

  @Get()
  @Permissions(Permission.VIEW_DECISIONS)
  @ApiOperation({ summary: 'Get overrides with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Overrides retrieved successfully' })
  async getOverrides(
    @Query('status') status?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('requestedBy') requestedBy?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ): Promise<{ overrides: any[]; total: number; page: number; limit: number }> {
    // This would typically implement proper filtering and pagination
    // For now, we'll return a placeholder response
    return {
      overrides: [],
      total: 0,
      page,
      limit
    };
  }
}