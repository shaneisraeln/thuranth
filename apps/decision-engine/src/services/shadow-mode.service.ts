import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecisionResponse, DecisionRequest } from '@pdcp/types';
import { DecisionEntity } from '../entities/decision.entity';

export interface ShadowModeConfig {
  enabled: boolean;
  comparisonEnabled: boolean;
  logAllDecisions: boolean;
  validationThreshold: number; // Minimum score difference to flag for review
}

export interface DecisionComparison {
  shadowDecision: DecisionResponse;
  productionDecision?: DecisionResponse;
  scoreDifference: number;
  vehicleDifference: boolean;
  requiresReview: boolean;
  comparisonTimestamp: Date;
}

@Injectable()
export class ShadowModeService {
  private readonly logger = new Logger(ShadowModeService.name);
  
  private config: ShadowModeConfig = {
    enabled: false,
    comparisonEnabled: false,
    logAllDecisions: true,
    validationThreshold: 10, // Flag if score difference > 10 points
  };

  constructor(
    @InjectRepository(DecisionEntity)
    private readonly decisionRepository: Repository<DecisionEntity>,
  ) {}

  /**
   * Updates shadow mode configuration
   */
  updateConfig(newConfig: Partial<ShadowModeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log(`Shadow mode configuration updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * Gets current shadow mode configuration
   */
  getConfig(): ShadowModeConfig {
    return { ...this.config };
  }

  /**
   * Checks if shadow mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Logs a shadow mode decision without executing it
   */
  async logShadowDecision(
    request: DecisionRequest,
    decision: DecisionResponse,
  ): Promise<void> {
    if (!this.config.logAllDecisions && !this.config.enabled) {
      return;
    }

    try {
      const shadowRecord = this.decisionRepository.create({
        parcelId: request.parcelId,
        requestTimestamp: decision.timestamp,
        recommendedVehicleId: decision.recommendedVehicleId,
        score: decision.score,
        explanation: decision.explanation,
        shadowMode: true,
        executed: false, // Shadow decisions are never executed
        overridden: false,
      });

      await this.decisionRepository.save(shadowRecord);

      this.logger.debug(`Shadow decision logged for parcel ${request.parcelId}: ${decision.requiresNewDispatch ? 'New dispatch' : `Vehicle ${decision.recommendedVehicleId}`}`);
    } catch (error) {
      this.logger.error(`Failed to log shadow decision for parcel ${request.parcelId}:`, error);
    }
  }

  /**
   * Compares shadow decision with production decision
   */
  async compareDecisions(
    request: DecisionRequest,
    shadowDecision: DecisionResponse,
    productionDecision: DecisionResponse,
  ): Promise<DecisionComparison> {
    const scoreDifference = Math.abs(shadowDecision.score - productionDecision.score);
    const vehicleDifference = shadowDecision.recommendedVehicleId !== productionDecision.recommendedVehicleId;
    const requiresReview = scoreDifference > this.config.validationThreshold || vehicleDifference;

    const comparison: DecisionComparison = {
      shadowDecision,
      productionDecision,
      scoreDifference,
      vehicleDifference,
      requiresReview,
      comparisonTimestamp: new Date(),
    };

    if (requiresReview) {
      this.logger.warn(`Decision comparison requires review for parcel ${request.parcelId}: Score diff ${scoreDifference.toFixed(1)}, Vehicle diff: ${vehicleDifference}`);
    }

    // Log comparison if enabled
    if (this.config.comparisonEnabled) {
      await this.logDecisionComparison(request, comparison);
    }

    return comparison;
  }

  /**
   * Validates shadow mode decisions against production decisions
   */
  async validateShadowDecisions(
    parcelId: string,
    timeRangeHours: number = 24,
  ): Promise<{
    totalComparisons: number;
    accurateDecisions: number;
    significantDifferences: number;
    averageScoreDifference: number;
  }> {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const shadowDecisions = await this.decisionRepository.find({
      where: {
        parcelId,
        shadowMode: true,
        createdAt: { $gte: cutoffTime } as any,
      },
      order: { createdAt: 'ASC' },
    });

    const productionDecisions = await this.decisionRepository.find({
      where: {
        parcelId,
        shadowMode: false,
        createdAt: { $gte: cutoffTime } as any,
      },
      order: { createdAt: 'ASC' },
    });

    let totalComparisons = 0;
    let accurateDecisions = 0;
    let significantDifferences = 0;
    let totalScoreDifference = 0;

    // Match shadow and production decisions by timestamp proximity
    for (const shadowDecision of shadowDecisions) {
      const matchingProduction = productionDecisions.find(prod => 
        Math.abs(prod.requestTimestamp.getTime() - shadowDecision.requestTimestamp.getTime()) < 5 * 60 * 1000 // Within 5 minutes
      );

      if (matchingProduction) {
        totalComparisons++;
        const scoreDiff = Math.abs(shadowDecision.score - matchingProduction.score);
        totalScoreDifference += scoreDiff;

        if (shadowDecision.recommendedVehicleId === matchingProduction.recommendedVehicleId) {
          accurateDecisions++;
        }

        if (scoreDiff > this.config.validationThreshold) {
          significantDifferences++;
        }
      }
    }

    const averageScoreDifference = totalComparisons > 0 ? totalScoreDifference / totalComparisons : 0;

    return {
      totalComparisons,
      accurateDecisions,
      significantDifferences,
      averageScoreDifference,
    };
  }

  /**
   * Gets shadow mode decision history
   */
  async getShadowDecisionHistory(
    parcelId?: string,
    limit: number = 100,
  ): Promise<DecisionEntity[]> {
    const queryBuilder = this.decisionRepository
      .createQueryBuilder('decision')
      .where('decision.shadowMode = :shadowMode', { shadowMode: true })
      .orderBy('decision.createdAt', 'DESC')
      .limit(limit);

    if (parcelId) {
      queryBuilder.andWhere('decision.parcelId = :parcelId', { parcelId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Enables shadow mode for testing
   */
  enableShadowMode(comparisonEnabled: boolean = false): void {
    this.updateConfig({
      enabled: true,
      comparisonEnabled,
      logAllDecisions: true,
    });
  }

  /**
   * Disables shadow mode
   */
  disableShadowMode(): void {
    this.updateConfig({
      enabled: false,
      comparisonEnabled: false,
    });
  }

  /**
   * Logs decision comparison for analysis
   */
  private async logDecisionComparison(
    request: DecisionRequest,
    comparison: DecisionComparison,
  ): Promise<void> {
    try {
      // In a real implementation, this might save to a separate comparison table
      // For now, we'll log it for monitoring
      this.logger.log(`Decision comparison for parcel ${request.parcelId}:`, {
        shadowVehicle: comparison.shadowDecision.recommendedVehicleId,
        productionVehicle: comparison.productionDecision?.recommendedVehicleId,
        shadowScore: comparison.shadowDecision.score,
        productionScore: comparison.productionDecision?.score,
        scoreDifference: comparison.scoreDifference,
        vehicleDifference: comparison.vehicleDifference,
        requiresReview: comparison.requiresReview,
      });
    } catch (error) {
      this.logger.error(`Failed to log decision comparison for parcel ${request.parcelId}:`, error);
    }
  }

  /**
   * Generates shadow mode performance report
   */
  async generatePerformanceReport(
    timeRangeHours: number = 24,
  ): Promise<{
    totalShadowDecisions: number;
    totalComparisons: number;
    accuracyRate: number;
    averageScoreDifference: number;
    significantDifferencesRate: number;
    recommendationsForImprovement: string[];
  }> {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const totalShadowDecisions = await this.decisionRepository.count({
      where: {
        shadowMode: true,
        createdAt: { $gte: cutoffTime } as any,
      },
    });

    // Get all unique parcel IDs from shadow decisions
    const shadowParcels = await this.decisionRepository
      .createQueryBuilder('decision')
      .select('DISTINCT decision.parcelId', 'parcelId')
      .where('decision.shadowMode = :shadowMode', { shadowMode: true })
      .andWhere('decision.createdAt >= :cutoffTime', { cutoffTime })
      .getRawMany();

    let totalComparisons = 0;
    let totalAccurate = 0;
    let totalScoreDifference = 0;
    let totalSignificantDifferences = 0;

    // Validate decisions for each parcel
    for (const parcel of shadowParcels) {
      const validation = await this.validateShadowDecisions(parcel.parcelId, timeRangeHours);
      totalComparisons += validation.totalComparisons;
      totalAccurate += validation.accurateDecisions;
      totalScoreDifference += validation.averageScoreDifference * validation.totalComparisons;
      totalSignificantDifferences += validation.significantDifferences;
    }

    const accuracyRate = totalComparisons > 0 ? totalAccurate / totalComparisons : 0;
    const averageScoreDifference = totalComparisons > 0 ? totalScoreDifference / totalComparisons : 0;
    const significantDifferencesRate = totalComparisons > 0 ? totalSignificantDifferences / totalComparisons : 0;

    const recommendationsForImprovement: string[] = [];
    
    if (accuracyRate < 0.8) {
      recommendationsForImprovement.push('Vehicle selection accuracy is below 80% - review scoring algorithm');
    }
    if (averageScoreDifference > 15) {
      recommendationsForImprovement.push('High average score difference - review constraint evaluation');
    }
    if (significantDifferencesRate > 0.2) {
      recommendationsForImprovement.push('High rate of significant differences - investigate decision consistency');
    }
    if (totalComparisons < totalShadowDecisions * 0.5) {
      recommendationsForImprovement.push('Low comparison rate - ensure production decisions are being logged');
    }

    return {
      totalShadowDecisions,
      totalComparisons,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageScoreDifference: Math.round(averageScoreDifference * 100) / 100,
      significantDifferencesRate: Math.round(significantDifferencesRate * 100) / 100,
      recommendationsForImprovement,
    };
  }
}