import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  OverrideRequest,
  OverrideResponse,
  OverrideStatus,
  OverrideRiskLevel,
  ApprovalStep,
  ApprovalStatus,
  OverrideAuthorizationConfig
} from '../interfaces/override.interfaces';
import { OverrideEntity } from '../entities/override.entity';


@Injectable()
export class OverrideAuthorizationService {
  private readonly logger = new Logger(OverrideAuthorizationService.name);

  // Configuration for approval requirements based on risk level
  private readonly authConfig: OverrideAuthorizationConfig = {
    lowRisk: {
      requiredApprovers: ['dispatcher'],
      timeoutMinutes: 30
    },
    mediumRisk: {
      requiredApprovers: ['dispatcher', 'admin'],
      timeoutMinutes: 60
    },
    highRisk: {
      requiredApprovers: ['admin', 'admin'], // Requires 2 admin approvals
      timeoutMinutes: 120
    },
    criticalRisk: {
      requiredApprovers: ['admin', 'admin', 'admin'], // Requires 3 admin approvals
      timeoutMinutes: 240
    }
  };

  constructor(
    @InjectRepository(OverrideEntity)
    private readonly overrideRepository: Repository<OverrideEntity>,
  ) {}

  /**
   * Initiates the override authorization process
   */
  async initiateOverrideAuthorization(
    overrideRequest: OverrideRequest
  ): Promise<OverrideResponse> {
    this.logger.log(`Initiating override authorization for decision ${overrideRequest.decisionId}`);

    try {
      // Validate user permissions
      await this.validateOverridePermissions(overrideRequest);

      // Determine effective risk level (escalate if bypassing SLA)
      const effectiveRiskLevel = this.determineEffectiveRiskLevel(
        overrideRequest.riskLevel, 
        overrideRequest.bypassesSLA
      );

      // Create approval chain based on effective risk level
      const approvalChain = this.createApprovalChain(effectiveRiskLevel);

      // Calculate expiration time
      const config = this.getConfigForRiskLevel(effectiveRiskLevel);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.timeoutMinutes);

      // Create override entity
      const overrideEntity = this.overrideRepository.create({
        decisionId: overrideRequest.decisionId,
        parcelId: overrideRequest.parcelId,
        requestedVehicleId: overrideRequest.requestedVehicleId,
        reason: overrideRequest.reason,
        justification: overrideRequest.justification,
        requestedBy: overrideRequest.requestedBy,
        bypassesSLA: overrideRequest.bypassesSLA,
        riskLevel: overrideRequest.riskLevel,
        status: OverrideStatus.PENDING,
        approvalChain,
        impactAssessment: overrideRequest.impactAssessment,
        expiresAt
      });

      const savedOverride = await this.overrideRepository.save(overrideEntity);

      // Notify approvers
      await this.notifyApprovers(savedOverride);

      const response: OverrideResponse = {
        overrideId: savedOverride.id,
        status: OverrideStatus.PENDING,
        approvalChain,
        estimatedApprovalTime: expiresAt,
        message: this.generateStatusMessage(effectiveRiskLevel, approvalChain)
      };

      this.logger.log(`Override authorization initiated: ${savedOverride.id}`);
      return response;

    } catch (error) {
      this.logger.error('Error initiating override authorization:', error);
      throw error;
    }
  }

  /**
   * Processes an approval or rejection from an approver
   */
  async processApproval(
    overrideId: string,
    approverId: string,
    approved: boolean,
    comments?: string
  ): Promise<OverrideResponse> {
    this.logger.log(`Processing approval for override ${overrideId} by ${approverId}: ${approved}`);

    const override = await this.overrideRepository.findOne({
      where: { id: overrideId }
    });

    if (!override) {
      throw new Error('Override request not found');
    }

    if (override.status !== OverrideStatus.PENDING) {
      throw new Error('Override request is not in pending status');
    }

    if (override.isExpired) {
      await this.overrideRepository.update(overrideId, { 
        status: OverrideStatus.EXPIRED 
      });
      throw new Error('Override request has expired');
    }

    // Find the pending approval step for this approver
    const approvalChain = [...override.approvalChain];
    const pendingStepIndex = approvalChain.findIndex(
      step => step.status === ApprovalStatus.PENDING && 
              (step.approverUserId === approverId || !step.approverUserId)
    );

    if (pendingStepIndex === -1) {
      throw new Error('No pending approval step found for this approver');
    }

    // Update the approval step
    approvalChain[pendingStepIndex] = {
      ...approvalChain[pendingStepIndex],
      approverUserId: approverId,
      status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      comments,
      timestamp: new Date()
    };

    let newStatus = OverrideStatus.PENDING;
    let approvedBy: string | undefined;
    let approvedAt: Date | undefined;
    let rejectedBy: string | undefined;
    let rejectedAt: Date | undefined;
    let rejectionReason: string | undefined;

    if (!approved) {
      // If any required step is rejected, the entire override is rejected
      newStatus = OverrideStatus.REJECTED;
      rejectedBy = approverId;
      rejectedAt = new Date();
      rejectionReason = comments || 'Approval rejected';
    } else {
      // Check if all required approvals are complete
      const allRequiredApproved = approvalChain
        .filter(step => step.required)
        .every(step => step.status === ApprovalStatus.APPROVED);

      if (allRequiredApproved) {
        newStatus = OverrideStatus.APPROVED;
        approvedBy = approverId;
        approvedAt = new Date();
      }
    }

    // Update override entity
    await this.overrideRepository.update(overrideId, {
      approvalChain,
      status: newStatus,
      approvedBy,
      approvedAt,
      rejectedBy,
      rejectedAt,
      rejectionReason
    });

    // Notify relevant parties of status change
    await this.notifyStatusChange(override, newStatus, approverId);

    const response: OverrideResponse = {
      overrideId,
      status: newStatus,
      approvalChain,
      message: this.generateStatusMessage(override.riskLevel, approvalChain, newStatus)
    };

    this.logger.log(`Override ${overrideId} status updated to: ${newStatus}`);
    return response;
  }

  /**
   * Executes an approved override
   */
  async executeOverride(overrideId: string, executedBy: string): Promise<void> {
    this.logger.log(`Executing override ${overrideId} by ${executedBy}`);

    const override = await this.overrideRepository.findOne({
      where: { id: overrideId }
    });

    if (!override) {
      throw new Error('Override request not found');
    }

    if (!override.canBeExecuted) {
      throw new Error('Override cannot be executed in current state');
    }

    // Update override as executed
    await this.overrideRepository.update(overrideId, {
      executedAt: new Date()
    });

    this.logger.log(`Override ${overrideId} executed successfully`);
  }

  /**
   * Validates that the user has permission to request an override
   */
  private async validateOverridePermissions(overrideRequest: OverrideRequest): Promise<void> {
    // This would typically check user permissions from auth service
    // For now, we'll implement basic validation logic
    
    if (overrideRequest.bypassesSLA) {
      // SLA bypass requires special permission
      // This would be validated against user's permissions
      this.logger.log(`SLA bypass requested by ${overrideRequest.requestedBy}`);
    }

    if (overrideRequest.riskLevel === OverrideRiskLevel.CRITICAL) {
      // Critical overrides might require additional validation
      this.logger.log(`Critical risk override requested by ${overrideRequest.requestedBy}`);
    }
  }

  /**
   * Determines effective risk level, escalating if bypassing SLA
   */
  private determineEffectiveRiskLevel(
    originalRiskLevel: OverrideRiskLevel,
    bypassesSLA: boolean
  ): OverrideRiskLevel {
    if (!bypassesSLA) {
      return originalRiskLevel;
    }

    // Escalate risk level when bypassing SLA
    switch (originalRiskLevel) {
      case OverrideRiskLevel.LOW:
        return OverrideRiskLevel.MEDIUM; // Escalate low to medium when bypassing SLA
      case OverrideRiskLevel.MEDIUM:
        return OverrideRiskLevel.HIGH; // Escalate medium to high when bypassing SLA
      case OverrideRiskLevel.HIGH:
        return OverrideRiskLevel.CRITICAL; // Escalate high to critical when bypassing SLA
      case OverrideRiskLevel.CRITICAL:
        return OverrideRiskLevel.CRITICAL; // Critical remains critical
      default:
        return OverrideRiskLevel.MEDIUM; // Default escalation
    }
  }

  /**
   * Creates approval chain based on risk level
   */
  private createApprovalChain(riskLevel: OverrideRiskLevel): ApprovalStep[] {
    const config = this.getConfigForRiskLevel(riskLevel);
    const approvalChain: ApprovalStep[] = [];

    config.requiredApprovers.forEach((role, index) => {
      approvalChain.push({
        id: `step_${index + 1}`,
        approverRole: role,
        status: ApprovalStatus.PENDING,
        required: true
      });
    });

    return approvalChain;
  }

  /**
   * Gets configuration for specific risk level
   */
  private getConfigForRiskLevel(riskLevel: OverrideRiskLevel) {
    switch (riskLevel) {
      case OverrideRiskLevel.LOW:
        return this.authConfig.lowRisk;
      case OverrideRiskLevel.MEDIUM:
        return this.authConfig.mediumRisk;
      case OverrideRiskLevel.HIGH:
        return this.authConfig.highRisk;
      case OverrideRiskLevel.CRITICAL:
        return this.authConfig.criticalRisk;
      default:
        return this.authConfig.lowRisk;
    }
  }

  /**
   * Generates status message for override response
   */
  private generateStatusMessage(
    riskLevel: OverrideRiskLevel,
    approvalChain: ApprovalStep[],
    status?: OverrideStatus
  ): string {
    if (status === OverrideStatus.APPROVED) {
      return 'Override request has been approved and can be executed';
    }

    if (status === OverrideStatus.REJECTED) {
      return 'Override request has been rejected';
    }

    if (status === OverrideStatus.EXPIRED) {
      return 'Override request has expired';
    }

    const pendingApprovals = approvalChain
      .filter(step => step.status === ApprovalStatus.PENDING && step.required)
      .length;

    const config = this.getConfigForRiskLevel(riskLevel);
    
    return `Override request pending approval. ${pendingApprovals} approval(s) required. ` +
           `Risk level: ${riskLevel.toUpperCase()}. Expires in ${config.timeoutMinutes} minutes.`;
  }

  /**
   * Notifies approvers of new override request
   */
  private async notifyApprovers(override: OverrideEntity): Promise<void> {
    // This would typically send notifications via email, SMS, or push notifications
    // For now, we'll just log the notification
    const pendingApprovers = override.approvalChain
      .filter(step => step.status === ApprovalStatus.PENDING)
      .map(step => step.approverRole);

    this.logger.log(`Notifying approvers for override ${override.id}: ${pendingApprovers.join(', ')}`);
  }

  /**
   * Notifies relevant parties of status changes
   */
  private async notifyStatusChange(
    override: OverrideEntity,
    newStatus: OverrideStatus,
    changedBy: string
  ): Promise<void> {
    this.logger.log(`Notifying status change for override ${override.id}: ${newStatus} by ${changedBy}`);
  }

  /**
   * Gets pending overrides for a specific approver role
   */
  async getPendingOverridesForApprover(approverRole: string): Promise<OverrideEntity[]> {
    const overrides = await this.overrideRepository
      .createQueryBuilder('override')
      .where('override.status = :status', { status: OverrideStatus.PENDING })
      .andWhere('override.expiresAt > :now', { now: new Date() })
      .getMany();

    // Filter overrides that have pending steps for this approver role
    return overrides.filter(override => 
      override.approvalChain.some(step => 
        step.approverRole === approverRole && 
        step.status === ApprovalStatus.PENDING
      )
    );
  }

  /**
   * Gets override by ID
   */
  async getOverrideById(overrideId: string): Promise<OverrideEntity | null> {
    return this.overrideRepository.findOne({
      where: { id: overrideId },
      relations: ['decision']
    });
  }

  /**
   * Gets all overrides for a specific decision
   */
  async getOverridesForDecision(decisionId: string): Promise<OverrideEntity[]> {
    return this.overrideRepository.find({
      where: { decisionId },
      order: { createdAt: 'DESC' }
    });
  }
}