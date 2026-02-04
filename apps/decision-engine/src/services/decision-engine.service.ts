import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  DecisionRequest, 
  DecisionResponse, 
  DecisionExplanation,
  Vehicle,
  VehicleOption,
} from '@pdcp/types';
import { DecisionEntity } from '../entities/decision.entity';
import { ConstraintEvaluatorService } from './constraint-evaluator.service';
import { RouteCalculatorService } from './route-calculator.service';
import { ScoringService } from './scoring.service';

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);

  constructor(
    @InjectRepository(DecisionEntity)
    private readonly decisionRepository: Repository<DecisionEntity>,
    private readonly constraintEvaluator: ConstraintEvaluatorService,
    private readonly routeCalculator: RouteCalculatorService,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Main decision engine method - evaluates parcel against available vehicles
   */
  async evaluateParcelAssignment(
    request: DecisionRequest,
    availableVehicles: Vehicle[],
    shadowMode: boolean = false,
  ): Promise<DecisionResponse> {
    const requestId = this.generateRequestId();
    const timestamp = new Date();

    this.logger.log(`Evaluating parcel assignment for parcel ${request.parcelId} (${availableVehicles.length} vehicles available)`);

    try {
      // Evaluate each vehicle against the parcel
      const vehicleEvaluations = await Promise.all(
        availableVehicles.map(vehicle => this.evaluateVehicle(request, vehicle))
      );

      // Filter vehicles that satisfy hard constraints
      const eligibleVehicles = vehicleEvaluations.filter(evaluation => evaluation.constraintsSatisfied);

      let recommendedVehicleId: string | undefined;
      let score = 0;
      let alternatives: VehicleOption[] = [];
      let requiresNewDispatch = false;

      if (eligibleVehicles.length > 0) {
        // Rank eligible vehicles by score
        alternatives = this.scoringService.rankVehicles(
          request,
          eligibleVehicles,
        );

        // Check if we should recommend the best vehicle or dispatch new one
        requiresNewDispatch = this.scoringService.shouldRecommendNewDispatch(alternatives);

        if (!requiresNewDispatch) {
          recommendedVehicleId = alternatives[0].vehicleId;
          score = alternatives[0].score;
        }
      } else {
        // No eligible vehicles - recommend new dispatch
        requiresNewDispatch = true;
        
        // Still provide alternatives with scores for analysis
        alternatives = this.scoringService.rankVehicles(
          request,
          vehicleEvaluations,
        );
      }

      // Generate explanation
      const explanation = await this.generateDecisionExplanation(
        request,
        vehicleEvaluations,
        recommendedVehicleId,
      );

      const response: DecisionResponse = {
        requestId,
        parcelId: request.parcelId,
        recommendedVehicleId,
        score,
        explanation,
        alternatives,
        requiresNewDispatch,
        shadowMode,
        timestamp,
      };

      // Save decision record
      await this.saveDecisionRecord(response);

      this.logger.log(`Decision completed for parcel ${request.parcelId}: ${requiresNewDispatch ? 'New dispatch recommended' : `Assigned to vehicle ${recommendedVehicleId}`}`);

      return response;

    } catch (error) {
      this.logger.error(`Error evaluating parcel assignment for ${request.parcelId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluates a single vehicle against a parcel request
   */
  private async evaluateVehicle(
    request: DecisionRequest,
    vehicle: Vehicle,
  ) {
    // Calculate route with new parcel
    const routeCalculation = await this.routeCalculator.calculateRouteWithParcel(
      vehicle.currentRoute,
      request.pickupLocation,
      request.deliveryLocation,
    );

    // Evaluate hard constraints
    const hardConstraints = this.constraintEvaluator.evaluateHardConstraints(
      request,
      vehicle,
      routeCalculation.estimatedDeliveryTime,
      routeCalculation.routeDeviation,
    );

    // Evaluate soft constraints
    const softConstraints = this.constraintEvaluator.evaluateSoftConstraints(
      request,
      vehicle,
      routeCalculation.estimatedDeliveryTime,
      routeCalculation.routeDeviation,
    );

    // Check if hard constraints are satisfied
    const constraintsSatisfied = this.constraintEvaluator.areHardConstraintsSatisfied(hardConstraints);

    return {
      vehicle,
      routeCalculation,
      hardConstraints,
      softConstraints,
      constraintsSatisfied,
    };
  }

  /**
   * Generates detailed explanation for the decision
   */
  private async generateDecisionExplanation(
    request: DecisionRequest,
    vehicleEvaluations: any[],
    recommendedVehicleId?: string,
  ): Promise<DecisionExplanation> {
    let hardConstraints: any[] = [];
    let softConstraints: any[] = [];
    let scoringFactors: any[] = [];
    let reasoning = '';

    if (recommendedVehicleId) {
      // Find the recommended vehicle evaluation
      const recommendedEval = vehicleEvaluations.find(
        evaluation => evaluation.vehicle.id === recommendedVehicleId
      );

      if (recommendedEval) {
        hardConstraints = recommendedEval.hardConstraints;
        softConstraints = recommendedEval.softConstraints;
        
        // Get scoring factors
        const scoringResult = this.scoringService.calculateScore({
          request,
          vehicle: recommendedEval.vehicle,
          routeCalculation: recommendedEval.routeCalculation,
        });
        scoringFactors = scoringResult.factors;

        reasoning = `Vehicle ${recommendedVehicleId} selected with score ${scoringResult.score.toFixed(1)}/100. ` +
          `Route deviation: ${recommendedEval.routeCalculation.routeDeviation.toFixed(1)}km, ` +
          `Estimated delivery: ${recommendedEval.routeCalculation.estimatedDeliveryTime.toLocaleString()}.`;
      }
    } else {
      // No vehicle recommended - explain why
      const eligibleCount = vehicleEvaluations.filter(evaluation => evaluation.constraintsSatisfied).length;
      
      if (eligibleCount === 0) {
        reasoning = `No vehicles satisfy hard constraints. ${vehicleEvaluations.length} vehicles evaluated, ` +
          `all failed capacity, SLA, or route deviation requirements. New vehicle dispatch recommended.`;
      } else {
        reasoning = `${eligibleCount} vehicles satisfy constraints but scores below acceptable threshold. ` +
          `New vehicle dispatch recommended for optimal service.`;
      }

      // Use constraints from best available vehicle for explanation
      if (vehicleEvaluations.length > 0) {
        const bestEval = vehicleEvaluations.reduce((best, current) => {
          const bestScore = this.scoringService.calculateScore({
            request,
            vehicle: best.vehicle,
            routeCalculation: best.routeCalculation,
          }).score;
          const currentScore = this.scoringService.calculateScore({
            request,
            vehicle: current.vehicle,
            routeCalculation: current.routeCalculation,
          }).score;
          return currentScore > bestScore ? current : best;
        });

        hardConstraints = bestEval.hardConstraints;
        softConstraints = bestEval.softConstraints;
      }
    }

    // Calculate risk assessment
    const riskAssessment = this.constraintEvaluator.calculateRiskAssessment(
      hardConstraints,
      softConstraints,
    );

    return {
      hardConstraints,
      softConstraints,
      scoringFactors,
      riskAssessment,
      reasoning,
    };
  }

  /**
   * Saves decision record to database
   */
  private async saveDecisionRecord(response: DecisionResponse): Promise<void> {
    const decisionRecord = this.decisionRepository.create({
      parcelId: response.parcelId,
      requestTimestamp: response.timestamp,
      recommendedVehicleId: response.recommendedVehicleId,
      score: response.score,
      explanation: response.explanation,
      shadowMode: response.shadowMode,
      executed: false, // Will be updated when assignment is actually executed
      overridden: false,
    });

    await this.decisionRepository.save(decisionRecord);
  }

  /**
   * Generates unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retrieves decision history for a parcel
   */
  async getDecisionHistory(parcelId: string): Promise<DecisionEntity[]> {
    return this.decisionRepository.find({
      where: { parcelId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Marks a decision as executed
   */
  async markDecisionExecuted(decisionId: string): Promise<void> {
    await this.decisionRepository.update(decisionId, { executed: true });
  }

  /**
   * Records a manual override
   */
  async recordManualOverride(
    decisionId: string,
    overrideReason: string,
    userId: string,
  ): Promise<void> {
    await this.decisionRepository.update(decisionId, {
      overridden: true,
      overrideReason,
      overrideUserId: userId,
    });
  }
}