import { Injectable } from '@nestjs/common';
import { ConstraintResult, DecisionRequest, RiskAssessment } from '@pdcp/types';
import { Vehicle, VehicleCapacity } from '@pdcp/types';

export interface ConstraintConfig {
  slaBufferMinutes: number;
  maxCapacityThreshold: number;
  maxRouteDeviationKm: number;
  nearFullThreshold: number;
}

@Injectable()
export class ConstraintEvaluatorService {
  private readonly config: ConstraintConfig = {
    slaBufferMinutes: 30, // 30 minute safety buffer for SLA
    maxCapacityThreshold: 0.95, // 95% max capacity utilization
    maxRouteDeviationKm: 10, // Maximum 10km route deviation
    nearFullThreshold: 0.9, // 90% near-full threshold
  };

  /**
   * Evaluates hard constraints that cannot be violated
   */
  evaluateHardConstraints(
    request: DecisionRequest,
    vehicle: Vehicle,
    estimatedDeliveryTime: Date,
    routeDeviation: number,
  ): ConstraintResult[] {
    const constraints: ConstraintResult[] = [];

    // Hard Constraint 1: Vehicle Capacity
    const capacityConstraint = this.evaluateCapacityConstraint(
      request,
      vehicle.capacity,
      true,
    );
    constraints.push(capacityConstraint);

    // Hard Constraint 2: SLA Safety Margin
    const slaConstraint = this.evaluateSLAConstraint(
      request.slaDeadline,
      estimatedDeliveryTime,
      true,
    );
    constraints.push(slaConstraint);

    // Hard Constraint 3: Maximum Route Deviation
    const routeConstraint = this.evaluateRouteDeviationConstraint(
      routeDeviation,
      true,
    );
    constraints.push(routeConstraint);

    return constraints;
  }

  /**
   * Evaluates soft constraints for optimization
   */
  evaluateSoftConstraints(
    request: DecisionRequest,
    vehicle: Vehicle,
    estimatedDeliveryTime: Date,
    routeDeviation: number,
  ): ConstraintResult[] {
    const constraints: ConstraintResult[] = [];

    // Soft Constraint 1: Optimal Capacity Utilization
    const optimalCapacityConstraint = this.evaluateOptimalCapacityConstraint(
      request,
      vehicle.capacity,
    );
    constraints.push(optimalCapacityConstraint);

    // Soft Constraint 2: Route Efficiency
    const routeEfficiencyConstraint = this.evaluateRouteEfficiencyConstraint(
      routeDeviation,
    );
    constraints.push(routeEfficiencyConstraint);

    // Soft Constraint 3: SLA Buffer Optimization
    const slaBufferConstraint = this.evaluateSLABufferConstraint(
      request.slaDeadline,
      estimatedDeliveryTime,
    );
    constraints.push(slaBufferConstraint);

    return constraints;
  }

  /**
   * Checks if all hard constraints are satisfied
   */
  areHardConstraintsSatisfied(hardConstraints: ConstraintResult[]): boolean {
    return hardConstraints.every(constraint => constraint.satisfied);
  }

  /**
   * Calculates risk assessment based on constraints
   */
  calculateRiskAssessment(
    hardConstraints: ConstraintResult[],
    _softConstraints: ConstraintResult[],
  ): RiskAssessment {
    const slaConstraint = hardConstraints.find(c => c.name === 'SLA_SAFETY_MARGIN');
    const capacityConstraint = hardConstraints.find(c => c.name === 'VEHICLE_CAPACITY');
    const routeConstraint = hardConstraints.find(c => c.name === 'ROUTE_DEVIATION');

    const slaRisk = this.calculateSLARisk(slaConstraint);
    const capacityRisk = this.calculateCapacityRisk(capacityConstraint);
    const routeRisk = this.calculateRouteRisk(routeConstraint);

    const overallRisk = (slaRisk + capacityRisk + routeRisk) / 3;

    const riskFactors: string[] = [];
    if (slaRisk > 0.7) riskFactors.push('High SLA violation risk');
    if (capacityRisk > 0.7) riskFactors.push('High capacity utilization risk');
    if (routeRisk > 0.7) riskFactors.push('High route deviation risk');

    return {
      slaRisk,
      capacityRisk,
      routeRisk,
      overallRisk,
      riskFactors,
    };
  }

  private evaluateCapacityConstraint(
    request: DecisionRequest,
    capacity: VehicleCapacity,
    isHard: boolean,
  ): ConstraintResult {
    const parcelVolume = request.dimensions.length * request.dimensions.width * request.dimensions.height;
    const newWeight = capacity.currentWeight + request.weight;
    const newVolume = capacity.currentVolume + parcelVolume;

    const weightUtilization = newWeight / capacity.maxWeight;
    const volumeUtilization = newVolume / capacity.maxVolume;
    const maxUtilization = Math.max(weightUtilization, volumeUtilization);

    const threshold = isHard ? this.config.maxCapacityThreshold : this.config.nearFullThreshold;
    const satisfied = maxUtilization <= threshold;

    return {
      name: isHard ? 'VEHICLE_CAPACITY' : 'OPTIMAL_CAPACITY',
      type: isHard ? 'HARD' : 'SOFT',
      satisfied,
      value: maxUtilization,
      threshold,
      description: isHard 
        ? `Vehicle capacity utilization must not exceed ${threshold * 100}%`
        : `Optimal capacity utilization should be below ${threshold * 100}%`,
    };
  }

  private evaluateSLAConstraint(
    slaDeadline: Date,
    estimatedDeliveryTime: Date,
    isHard: boolean,
  ): ConstraintResult {
    const bufferMinutes = isHard ? this.config.slaBufferMinutes : this.config.slaBufferMinutes * 2;
    const requiredDeliveryTime = new Date(slaDeadline.getTime() - bufferMinutes * 60 * 1000);
    const satisfied = estimatedDeliveryTime <= requiredDeliveryTime;

    const marginMinutes = (requiredDeliveryTime.getTime() - estimatedDeliveryTime.getTime()) / (1000 * 60);

    return {
      name: isHard ? 'SLA_SAFETY_MARGIN' : 'SLA_BUFFER_OPTIMIZATION',
      type: isHard ? 'HARD' : 'SOFT',
      satisfied,
      value: marginMinutes,
      threshold: bufferMinutes,
      description: isHard
        ? `Delivery must complete ${bufferMinutes} minutes before SLA deadline`
        : `Optimal delivery should complete ${bufferMinutes} minutes before SLA deadline`,
    };
  }

  private evaluateRouteDeviationConstraint(
    routeDeviation: number,
    isHard: boolean,
  ): ConstraintResult {
    const threshold = isHard ? this.config.maxRouteDeviationKm : this.config.maxRouteDeviationKm * 0.5;
    const satisfied = routeDeviation <= threshold;

    return {
      name: isHard ? 'ROUTE_DEVIATION' : 'ROUTE_EFFICIENCY',
      type: isHard ? 'HARD' : 'SOFT',
      satisfied,
      value: routeDeviation,
      threshold,
      description: isHard
        ? `Route deviation must not exceed ${threshold}km`
        : `Optimal route deviation should be below ${threshold}km`,
    };
  }

  private evaluateOptimalCapacityConstraint(
    request: DecisionRequest,
    capacity: VehicleCapacity,
  ): ConstraintResult {
    return this.evaluateCapacityConstraint(request, capacity, false);
  }

  private evaluateRouteEfficiencyConstraint(routeDeviation: number): ConstraintResult {
    return this.evaluateRouteDeviationConstraint(routeDeviation, false);
  }

  private evaluateSLABufferConstraint(
    slaDeadline: Date,
    estimatedDeliveryTime: Date,
  ): ConstraintResult {
    return this.evaluateSLAConstraint(slaDeadline, estimatedDeliveryTime, false);
  }

  private calculateSLARisk(constraint?: ConstraintResult): number {
    if (!constraint) return 0;
    
    if (constraint.satisfied) {
      // Lower risk when we have more buffer time
      const bufferRatio = constraint.value / constraint.threshold;
      return Math.max(0, 1 - bufferRatio);
    } else {
      // High risk when SLA constraint is violated
      return 1;
    }
  }

  private calculateCapacityRisk(constraint?: ConstraintResult): number {
    if (!constraint) return 0;
    
    // Risk increases as capacity utilization approaches threshold
    return Math.min(1, constraint.value / constraint.threshold);
  }

  private calculateRouteRisk(constraint?: ConstraintResult): number {
    if (!constraint) return 0;
    
    // Risk increases with route deviation
    return Math.min(1, constraint.value / constraint.threshold);
  }
}