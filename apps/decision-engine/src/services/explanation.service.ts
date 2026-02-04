import { Injectable } from '@nestjs/common';
import { 
  DecisionExplanation, 
  ConstraintResult, 
  ScoringFactor, 
  RiskAssessment,
  DecisionRequest,
  VehicleOption,
} from '@pdcp/types';

@Injectable()
export class ExplanationService {
  /**
   * Generates comprehensive decision explanation
   */
  generateDetailedExplanation(
    request: DecisionRequest,
    recommendedVehicleId: string | undefined,
    alternatives: VehicleOption[],
    vehicleEvaluations: any[],
    requiresNewDispatch: boolean,
  ): DecisionExplanation {
    let hardConstraints: ConstraintResult[] = [];
    let softConstraints: ConstraintResult[] = [];
    let scoringFactors: ScoringFactor[] = [];
    let riskAssessment: RiskAssessment;
    let reasoning: string = '';

    if (recommendedVehicleId && !requiresNewDispatch) {
      // Vehicle was recommended
      const recommendedEval = vehicleEvaluations.find(
        evaluation => evaluation.vehicle.id === recommendedVehicleId
      );

      if (recommendedEval) {
        hardConstraints = recommendedEval.hardConstraints;
        softConstraints = recommendedEval.softConstraints;
        scoringFactors = recommendedEval.scoringFactors || [];

        reasoning = this.generateSuccessfulAssignmentReasoning(
          recommendedEval,
          alternatives,
          request,
        );
      }
    } else {
      // No vehicle recommended or new dispatch required
      reasoning = this.generateNewDispatchReasoning(
        vehicleEvaluations,
        alternatives,
        request,
        requiresNewDispatch,
      );

      // Use best available vehicle's constraints for analysis
      if (vehicleEvaluations.length > 0) {
        const bestEval = this.findBestVehicleEvaluation(vehicleEvaluations);
        hardConstraints = bestEval.hardConstraints;
        softConstraints = bestEval.softConstraints;
      }
    }

    // Calculate risk assessment
    riskAssessment = this.calculateDetailedRiskAssessment(
      hardConstraints,
      softConstraints,
      alternatives,
      requiresNewDispatch,
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
   * Generates reasoning for successful vehicle assignment
   */
  private generateSuccessfulAssignmentReasoning(
    recommendedEval: any,
    alternatives: VehicleOption[],
    request: DecisionRequest,
  ): string {
    const vehicle = recommendedEval.vehicle;
    const routeCalc = recommendedEval.routeCalculation;
    const bestScore = alternatives[0]?.score || 0;

    let reasoning = `Vehicle ${vehicle.id} (${vehicle.registrationNumber}) selected as the optimal choice with a score of ${bestScore.toFixed(1)}/100.\n\n`;

    // Route analysis
    reasoning += `**Route Impact:**\n`;
    reasoning += `- Additional distance: ${routeCalc.routeDeviation.toFixed(1)}km\n`;
    reasoning += `- Estimated delivery time: ${routeCalc.estimatedDeliveryTime.toLocaleString()}\n`;
    reasoning += `- Total route duration: ${Math.round(routeCalc.totalDuration)} minutes\n\n`;

    // Capacity analysis
    const newWeight = vehicle.capacity.currentWeight + request.weight;
    const weightUtilization = (newWeight / vehicle.capacity.maxWeight * 100).toFixed(1);
    reasoning += `**Capacity Analysis:**\n`;
    reasoning += `- Current load: ${vehicle.capacity.currentWeight}kg / ${vehicle.capacity.maxWeight}kg\n`;
    reasoning += `- After assignment: ${newWeight}kg (${weightUtilization}% utilization)\n`;
    reasoning += `- Remaining capacity: ${(vehicle.capacity.maxWeight - newWeight).toFixed(1)}kg\n\n`;

    // SLA analysis
    const timeToSLA = request.slaDeadline.getTime() - routeCalc.estimatedDeliveryTime.getTime();
    const hoursToSLA = (timeToSLA / (1000 * 60 * 60)).toFixed(1);
    reasoning += `**SLA Compliance:**\n`;
    reasoning += `- SLA deadline: ${request.slaDeadline.toLocaleString()}\n`;
    reasoning += `- Buffer time: ${hoursToSLA} hours\n`;
    reasoning += `- Risk level: ${timeToSLA > 2 * 60 * 60 * 1000 ? 'Low' : timeToSLA > 1 * 60 * 60 * 1000 ? 'Medium' : 'High'}\n\n`;

    // Alternative analysis
    if (alternatives.length > 1) {
      reasoning += `**Alternative Vehicles:**\n`;
      alternatives.slice(1, 4).forEach((alt) => {
        reasoning += `- Vehicle ${alt.vehicleId}: Score ${alt.score.toFixed(1)}, `;
        reasoning += `Deviation ${alt.routeDeviation.toFixed(1)}km, `;
        reasoning += `Capacity ${alt.capacityUtilization.toFixed(1)}%\n`;
      });
      if (alternatives.length > 4) {
        reasoning += `- ... and ${alternatives.length - 4} other vehicles evaluated\n`;
      }
    }

    return reasoning;
  }

  /**
   * Generates reasoning for new dispatch recommendation
   */
  private generateNewDispatchReasoning(
    vehicleEvaluations: any[],
    alternatives: VehicleOption[],
    _request: DecisionRequest,
    _requiresNewDispatch: boolean,
  ): string {
    let reasoning = `**New Vehicle Dispatch Recommended**\n\n`;

    if (vehicleEvaluations.length === 0) {
      reasoning += `No vehicles are currently available for evaluation. A new vehicle dispatch is required to fulfill this delivery request.\n\n`;
      return reasoning;
    }

    const eligibleVehicles = vehicleEvaluations.filter(evaluation => evaluation.constraintsSatisfied);
    const totalVehicles = vehicleEvaluations.length;

    reasoning += `**Analysis Summary:**\n`;
    reasoning += `- Total vehicles evaluated: ${totalVehicles}\n`;
    reasoning += `- Vehicles meeting hard constraints: ${eligibleVehicles.length}\n`;
    reasoning += `- Best available score: ${alternatives[0]?.score.toFixed(1) || 0}/100\n\n`;

    if (eligibleVehicles.length === 0) {
      reasoning += `**Constraint Violations:**\n`;
      
      // Analyze common constraint failures
      const capacityFailures = vehicleEvaluations.filter(evaluation => 
        evaluation.hardConstraints.some((c: any) => c.name === 'VEHICLE_CAPACITY' && !c.satisfied)
      ).length;
      
      const slaFailures = vehicleEvaluations.filter(evaluation => 
        evaluation.hardConstraints.some((c: any) => c.name === 'SLA_SAFETY_MARGIN' && !c.satisfied)
      ).length;
      
      const routeFailures = vehicleEvaluations.filter(evaluation => 
        evaluation.hardConstraints.some((c: any) => c.name === 'ROUTE_DEVIATION' && !c.satisfied)
      ).length;

      if (capacityFailures > 0) {
        reasoning += `- ${capacityFailures} vehicles exceed capacity limits\n`;
      }
      if (slaFailures > 0) {
        reasoning += `- ${slaFailures} vehicles cannot meet SLA requirements\n`;
      }
      if (routeFailures > 0) {
        reasoning += `- ${routeFailures} vehicles require excessive route deviation\n`;
      }
      reasoning += `\n`;
    } else {
      reasoning += `**Quality Assessment:**\n`;
      reasoning += `While ${eligibleVehicles.length} vehicles meet minimum requirements, their scores fall below the acceptable threshold for optimal service delivery.\n\n`;
      
      reasoning += `**Top Alternative Analysis:**\n`;
      if (alternatives.length > 0) {
        const best = alternatives[0];
        reasoning += `- Best vehicle: ${best.vehicleId}\n`;
        reasoning += `- Score: ${best.score.toFixed(1)}/100 (below 50.0 threshold)\n`;
        reasoning += `- Route deviation: ${best.routeDeviation.toFixed(1)}km\n`;
        reasoning += `- Capacity utilization: ${best.capacityUtilization.toFixed(1)}%\n\n`;
      }
    }

    reasoning += `**Recommendation:**\n`;
    reasoning += `Dispatch a new vehicle to ensure optimal delivery performance and maintain service quality standards.\n`;

    return reasoning;
  }

  /**
   * Calculates detailed risk assessment
   */
  private calculateDetailedRiskAssessment(
    hardConstraints: ConstraintResult[],
    _softConstraints: ConstraintResult[],
    alternatives: VehicleOption[],
    requiresNewDispatch: boolean,
  ): RiskAssessment {
    let slaRisk = 0;
    let capacityRisk = 0;
    let routeRisk = 0;
    const riskFactors: string[] = [];

    if (requiresNewDispatch) {
      // Higher baseline risk when new dispatch is required
      slaRisk = 0.3;
      capacityRisk = 0.2;
      routeRisk = 0.2;
      riskFactors.push('New vehicle dispatch increases delivery uncertainty');
    } else if (alternatives.length > 0) {
      // Calculate risk based on best alternative
      const best = alternatives[0];
      
      // SLA risk based on delivery time buffer
      if (best.estimatedDeliveryTime) {
        const timeBuffer = best.estimatedDeliveryTime.getTime() - Date.now();
        const hoursBuffer = timeBuffer / (1000 * 60 * 60);
        slaRisk = Math.max(0, 1 - hoursBuffer / 4); // Risk increases as buffer decreases
        
        if (hoursBuffer < 1) {
          riskFactors.push('Very tight delivery timeline');
        } else if (hoursBuffer < 2) {
          riskFactors.push('Limited delivery time buffer');
        }
      }

      // Capacity risk
      capacityRisk = best.capacityUtilization / 100;
      if (capacityRisk > 0.9) {
        riskFactors.push('Vehicle near maximum capacity');
      } else if (capacityRisk > 0.8) {
        riskFactors.push('High vehicle capacity utilization');
      }

      // Route risk
      routeRisk = Math.min(1, best.routeDeviation / 10); // Risk increases with deviation
      if (best.routeDeviation > 8) {
        riskFactors.push('Significant route deviation required');
      } else if (best.routeDeviation > 5) {
        riskFactors.push('Moderate route deviation');
      }
    }

    // Check for constraint violations
    const violatedHardConstraints = hardConstraints.filter(c => !c.satisfied);
    if (violatedHardConstraints.length > 0) {
      riskFactors.push(`${violatedHardConstraints.length} hard constraint violations`);
      slaRisk = Math.max(slaRisk, 0.8);
    }

    const overallRisk = (slaRisk + capacityRisk + routeRisk) / 3;

    return {
      slaRisk: Math.round(slaRisk * 100) / 100,
      capacityRisk: Math.round(capacityRisk * 100) / 100,
      routeRisk: Math.round(routeRisk * 100) / 100,
      overallRisk: Math.round(overallRisk * 100) / 100,
      riskFactors,
    };
  }

  /**
   * Finds the best vehicle evaluation based on score
   */
  private findBestVehicleEvaluation(vehicleEvaluations: any[]): any {
    return vehicleEvaluations.reduce((best, current) => {
      // Simple comparison - in practice would use actual scoring
      const bestConstraintsSatisfied = best.constraintsSatisfied;
      const currentConstraintsSatisfied = current.constraintsSatisfied;
      
      if (currentConstraintsSatisfied && !bestConstraintsSatisfied) {
        return current;
      }
      if (!currentConstraintsSatisfied && bestConstraintsSatisfied) {
        return best;
      }
      
      // Both have same constraint satisfaction, compare by eligibility score
      return current.vehicle.eligibilityScore > best.vehicle.eligibilityScore ? current : best;
    });
  }
}