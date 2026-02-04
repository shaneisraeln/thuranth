import { Injectable, Logger } from '@nestjs/common';
import { 
  OverrideImpactAssessment,
  SLARiskAssessment,
  CapacityImpactAssessment,
  RouteImpactAssessment,
  CostImpactAssessment,
  OverrideRequest,
  OverrideRiskLevel
} from '../interfaces/override.interfaces';
import { DecisionRequest, Vehicle, Parcel } from '@pdcp/types';
import { RouteCalculatorService } from './route-calculator.service';
import { ConstraintEvaluatorService } from './constraint-evaluator.service';

@Injectable()
export class OverrideImpactService {
  private readonly logger = new Logger(OverrideImpactService.name);

  constructor(
    private readonly routeCalculator: RouteCalculatorService,
    private readonly constraintEvaluator: ConstraintEvaluatorService,
  ) {}

  /**
   * Performs comprehensive impact assessment for an override request
   */
  async assessOverrideImpact(
    overrideRequest: OverrideRequest,
    decisionRequest: DecisionRequest,
    targetVehicle: Vehicle,
    affectedParcels: Parcel[]
  ): Promise<OverrideImpactAssessment> {
    this.logger.log(`Assessing impact for override request ${overrideRequest.decisionId}`);

    try {
      // Assess SLA risk
      const slaRisk = await this.assessSLARisk(
        decisionRequest,
        targetVehicle,
        affectedParcels,
        overrideRequest.bypassesSLA
      );

      // Assess capacity impact
      const capacityImpact = await this.assessCapacityImpact(
        decisionRequest,
        targetVehicle
      );

      // Assess route impact
      const routeImpact = await this.assessRouteImpact(
        decisionRequest,
        targetVehicle
      );

      // Assess cost impact
      const costImpact = await this.assessCostImpact(
        slaRisk,
        capacityImpact,
        routeImpact
      );

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(
        slaRisk,
        capacityImpact,
        routeImpact,
        costImpact
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        slaRisk,
        capacityImpact,
        routeImpact,
        costImpact,
        overallRiskScore
      );

      const assessment: OverrideImpactAssessment = {
        slaRisk,
        capacityImpact,
        routeImpact,
        costImpact,
        overallRiskScore,
        recommendations
      };

      this.logger.log(`Impact assessment completed with risk score: ${overallRiskScore}`);
      return assessment;

    } catch (error) {
      this.logger.error('Error assessing override impact:', error);
      throw error;
    }
  }

  /**
   * Assesses SLA risk for the override
   */
  private async assessSLARisk(
    decisionRequest: DecisionRequest,
    targetVehicle: Vehicle,
    affectedParcels: Parcel[],
    bypassesSLA: boolean
  ): Promise<SLARiskAssessment> {
    const affectedParcelIds = affectedParcels.map(p => p.id);
    
    // Calculate route with new parcel
    const routeCalculation = await this.routeCalculator.calculateRouteWithParcel(
      targetVehicle.currentRoute,
      decisionRequest.pickupLocation,
      decisionRequest.deliveryLocation
    );

    // Estimate delay for each affected parcel
    let maxDelayMinutes = 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const parcel of affectedParcels) {
      const originalETA = parcel.estimatedDeliveryTime;
      const newETA = routeCalculation.estimatedDeliveryTime;
      const delayMinutes = Math.max(0, (newETA.getTime() - originalETA.getTime()) / (1000 * 60));
      
      maxDelayMinutes = Math.max(maxDelayMinutes, delayMinutes);

      // Check if this causes SLA violation
      if (newETA > parcel.slaDeadline) {
        const violationMinutes = (newETA.getTime() - parcel.slaDeadline.getTime()) / (1000 * 60);
        if (violationMinutes > 60) {
          riskLevel = 'critical';
        } else if (violationMinutes > 30) {
          riskLevel = 'high';
        } else if (violationMinutes > 15) {
          riskLevel = 'medium';
        }
      }
    }

    // If explicitly bypassing SLA, escalate risk level
    if (bypassesSLA && riskLevel === 'low') {
      riskLevel = 'medium';
    }

    const mitigationOptions = this.generateSLAMitigationOptions(
      riskLevel,
      maxDelayMinutes,
      affectedParcels.length
    );

    return {
      affectedParcels: affectedParcelIds,
      riskLevel,
      estimatedDelayMinutes: maxDelayMinutes,
      mitigationOptions
    };
  }

  /**
   * Assesses capacity impact for the override
   */
  private async assessCapacityImpact(
    decisionRequest: DecisionRequest,
    targetVehicle: Vehicle
  ): Promise<CapacityImpactAssessment> {
    const currentUtilization = targetVehicle.capacity.utilizationPercentage;
    
    // Calculate projected utilization with new parcel
    const additionalWeight = decisionRequest.weight;
    const additionalVolume = decisionRequest.dimensions.length * 
                            decisionRequest.dimensions.width * 
                            decisionRequest.dimensions.height;

    const projectedWeight = targetVehicle.capacity.currentWeight + additionalWeight;
    const projectedVolume = targetVehicle.capacity.currentVolume + additionalVolume;

    const weightUtilization = (projectedWeight / targetVehicle.capacity.maxWeight) * 100;
    const volumeUtilization = (projectedVolume / targetVehicle.capacity.maxVolume) * 100;
    const projectedUtilization = Math.max(weightUtilization, volumeUtilization);

    const exceedsCapacity = projectedUtilization > 100;

    // Find alternative vehicles if capacity is exceeded
    const alternativeVehicles: string[] = [];
    if (exceedsCapacity) {
      // This would typically query for available vehicles with sufficient capacity
      // For now, we'll return empty array as placeholder
    }

    return {
      vehicleId: targetVehicle.id,
      currentUtilization,
      projectedUtilization,
      exceedsCapacity,
      alternativeVehicles
    };
  }

  /**
   * Assesses route impact for the override
   */
  private async assessRouteImpact(
    decisionRequest: DecisionRequest,
    targetVehicle: Vehicle
  ): Promise<RouteImpactAssessment> {
    // Calculate route with new parcel
    const routeCalculation = await this.routeCalculator.calculateRouteWithParcel(
      targetVehicle.currentRoute,
      decisionRequest.pickupLocation,
      decisionRequest.deliveryLocation
    );

    const additionalDistance = routeCalculation.routeDeviation;
    const additionalTime = routeCalculation.additionalTime || 0;

    // Estimate fuel cost increase (assuming 10 km/liter and $1.2/liter)
    const fuelEfficiency = targetVehicle.type === '2W' ? 40 : 10; // km/liter
    const fuelPrice = 1.2; // $/liter
    const fuelCostIncrease = (additionalDistance / fuelEfficiency) * fuelPrice;

    // Estimate emissions increase (kg CO2 per km)
    const emissionFactor = targetVehicle.type === '2W' ? 0.06 : 0.25; // kg CO2/km
    const emissionsIncrease = additionalDistance * emissionFactor;

    return {
      additionalDistance,
      additionalTime,
      fuelCostIncrease,
      emissionsIncrease
    };
  }

  /**
   * Assesses cost impact for the override
   */
  private async assessCostImpact(
    slaRisk: SLARiskAssessment,
    capacityImpact: CapacityImpactAssessment,
    routeImpact: RouteImpactAssessment
  ): Promise<CostImpactAssessment> {
    const additionalFuelCost = routeImpact.fuelCostIncrease;

    // Estimate potential penalties based on SLA risk
    let potentialPenalties = 0;
    if (slaRisk.riskLevel === 'critical') {
      potentialPenalties = slaRisk.affectedParcels.length * 50; // $50 per parcel
    } else if (slaRisk.riskLevel === 'high') {
      potentialPenalties = slaRisk.affectedParcels.length * 25; // $25 per parcel
    } else if (slaRisk.riskLevel === 'medium') {
      potentialPenalties = slaRisk.affectedParcels.length * 10; // $10 per parcel
    }

    // Estimate operational cost increase
    const operationalCostIncrease = routeImpact.additionalTime * 0.5; // $0.5 per minute

    const totalEstimatedCost = additionalFuelCost + potentialPenalties + operationalCostIncrease;

    return {
      additionalFuelCost,
      potentialPenalties,
      operationalCostIncrease,
      totalEstimatedCost
    };
  }

  /**
   * Calculates overall risk score (0-100)
   */
  private calculateOverallRiskScore(
    slaRisk: SLARiskAssessment,
    capacityImpact: CapacityImpactAssessment,
    routeImpact: RouteImpactAssessment,
    costImpact: CostImpactAssessment
  ): number {
    let score = 0;

    // SLA risk component (40% weight)
    const slaRiskScore = this.getSLARiskScore(slaRisk.riskLevel);
    score += slaRiskScore * 0.4;

    // Capacity risk component (30% weight)
    const capacityRiskScore = capacityImpact.exceedsCapacity ? 100 : 
                             capacityImpact.projectedUtilization > 95 ? 80 :
                             capacityImpact.projectedUtilization > 90 ? 60 : 20;
    score += capacityRiskScore * 0.3;

    // Route impact component (20% weight)
    const routeRiskScore = Math.min(100, routeImpact.additionalDistance * 5); // 5 points per km
    score += routeRiskScore * 0.2;

    // Cost impact component (10% weight)
    const costRiskScore = Math.min(100, costImpact.totalEstimatedCost * 2); // 2 points per dollar
    score += costRiskScore * 0.1;

    return Math.round(score);
  }

  /**
   * Converts SLA risk level to numeric score
   */
  private getSLARiskScore(riskLevel: string): number {
    switch (riskLevel) {
      case 'critical': return 100;
      case 'high': return 80;
      case 'medium': return 60;
      case 'low': return 20;
      default: return 0;
    }
  }

  /**
   * Generates SLA mitigation options
   */
  private generateSLAMitigationOptions(
    riskLevel: string,
    delayMinutes: number,
    affectedParcelCount: number
  ): string[] {
    const options: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      options.push('Consider dispatching additional vehicle for time-sensitive parcels');
      options.push('Notify customers of potential delays proactively');
      options.push('Explore premium delivery options for affected parcels');
    }

    if (delayMinutes > 30) {
      options.push('Optimize route to minimize additional travel time');
      options.push('Consider splitting delivery across multiple vehicles');
    }

    if (affectedParcelCount > 5) {
      options.push('Evaluate impact on overall fleet efficiency');
      options.push('Consider rescheduling non-urgent deliveries');
    }

    options.push('Monitor delivery progress closely for early intervention');
    
    return options;
  }

  /**
   * Generates recommendations based on impact assessment
   */
  private generateRecommendations(
    slaRisk: SLARiskAssessment,
    capacityImpact: CapacityImpactAssessment,
    routeImpact: RouteImpactAssessment,
    costImpact: CostImpactAssessment,
    overallRiskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (overallRiskScore > 80) {
      recommendations.push('HIGH RISK: Consider rejecting this override request');
      recommendations.push('Explore alternative vehicles or dispatch new vehicle');
    } else if (overallRiskScore > 60) {
      recommendations.push('MEDIUM RISK: Proceed with caution and additional monitoring');
    } else {
      recommendations.push('LOW RISK: Override can proceed with standard monitoring');
    }

    if (capacityImpact.exceedsCapacity) {
      recommendations.push('CAPACITY EXCEEDED: This assignment will overload the vehicle');
      recommendations.push('Consider alternative vehicles with sufficient capacity');
    }

    if (slaRisk.riskLevel === 'critical' || slaRisk.riskLevel === 'high') {
      recommendations.push('SLA RISK: This override may cause delivery delays');
      recommendations.push('Implement proactive customer communication');
    }

    if (costImpact.totalEstimatedCost > 100) {
      recommendations.push('HIGH COST IMPACT: Estimated additional cost exceeds $100');
      recommendations.push('Evaluate cost-benefit ratio before approval');
    }

    return recommendations;
  }

  /**
   * Determines override risk level based on impact assessment
   */
  determineRiskLevel(assessment: OverrideImpactAssessment): OverrideRiskLevel {
    if (assessment.overallRiskScore > 80) {
      return OverrideRiskLevel.CRITICAL;
    } else if (assessment.overallRiskScore > 60) {
      return OverrideRiskLevel.HIGH;
    } else if (assessment.overallRiskScore > 40) {
      return OverrideRiskLevel.MEDIUM;
    } else {
      return OverrideRiskLevel.LOW;
    }
  }
}