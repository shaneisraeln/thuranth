import { Injectable } from '@nestjs/common';
import { ScoringFactor, DecisionRequest, Vehicle, VehicleOption } from '@pdcp/types';
import { RouteCalculation } from './route-calculator.service';

export interface ScoringWeights {
  routeEfficiency: number;
  capacityUtilization: number;
  deliveryTime: number;
  vehicleEligibility: number;
}

export interface ScoringInput {
  request: DecisionRequest;
  vehicle: Vehicle;
  routeCalculation: RouteCalculation;
}

@Injectable()
export class ScoringService {
  private readonly weights: ScoringWeights = {
    routeEfficiency: 0.30,    // 30% - minimize additional distance/time
    capacityUtilization: 0.25, // 25% - optimize vehicle loading
    deliveryTime: 0.25,       // 25% - minimize delivery time impact
    vehicleEligibility: 0.20, // 20% - driver performance and vehicle suitability
  };

  /**
   * Calculates weighted score for a vehicle-parcel assignment
   */
  calculateScore(input: ScoringInput): { score: number; factors: ScoringFactor[] } {
    const factors: ScoringFactor[] = [];

    // Route Efficiency Score (0-100)
    const routeEfficiencyScore = this.calculateRouteEfficiencyScore(
      input.routeCalculation.routeDeviation,
    );
    factors.push({
      name: 'Route Efficiency',
      weight: this.weights.routeEfficiency,
      score: routeEfficiencyScore,
      maxScore: 100,
      description: `Minimizes route deviation (${input.routeCalculation.routeDeviation.toFixed(1)}km additional)`,
    });

    // Capacity Utilization Score (0-100)
    const capacityScore = this.calculateCapacityUtilizationScore(
      input.request,
      input.vehicle.capacity,
    );
    factors.push({
      name: 'Capacity Utilization',
      weight: this.weights.capacityUtilization,
      score: capacityScore,
      maxScore: 100,
      description: `Optimizes vehicle loading (${((input.vehicle.capacity.currentWeight + input.request.weight) / input.vehicle.capacity.maxWeight * 100).toFixed(1)}% utilization)`,
    });

    // Delivery Time Score (0-100)
    const deliveryTimeScore = this.calculateDeliveryTimeScore(
      input.request.slaDeadline,
      input.routeCalculation.estimatedDeliveryTime,
    );
    factors.push({
      name: 'Delivery Time Impact',
      weight: this.weights.deliveryTime,
      score: deliveryTimeScore,
      maxScore: 100,
      description: `Minimizes delivery time impact (${Math.round((input.routeCalculation.estimatedDeliveryTime.getTime() - Date.now()) / (1000 * 60))} minutes to delivery)`,
    });

    // Vehicle Eligibility Score (0-100)
    const eligibilityScore = this.calculateVehicleEligibilityScore(input.vehicle);
    factors.push({
      name: 'Vehicle Eligibility',
      weight: this.weights.vehicleEligibility,
      score: eligibilityScore,
      maxScore: 100,
      description: `Vehicle and driver suitability (${(input.vehicle.eligibilityScore * 100).toFixed(1)}% eligibility)`,
    });

    // Calculate weighted total score
    const totalScore = factors.reduce((sum, factor) => {
      return sum + (factor.score * factor.weight);
    }, 0);

    return {
      score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      factors,
    };
  }

  /**
   * Ranks multiple vehicles for a parcel assignment
   */
  rankVehicles(
    request: DecisionRequest,
    vehicleOptions: Array<{
      vehicle: Vehicle;
      routeCalculation: RouteCalculation;
      constraintsSatisfied: boolean;
    }>,
  ): VehicleOption[] {
    const scoredOptions = vehicleOptions.map(option => {
      const { score } = this.calculateScore({
        request,
        vehicle: option.vehicle,
        routeCalculation: option.routeCalculation,
      });

      return {
        vehicleId: option.vehicle.id,
        score: option.constraintsSatisfied ? score : 0, // Zero score if constraints not satisfied
        estimatedDeliveryTime: option.routeCalculation.estimatedDeliveryTime,
        routeDeviation: option.routeCalculation.routeDeviation,
        capacityUtilization: this.calculateNewCapacityUtilization(request, option.vehicle.capacity),
      };
    });

    // Sort by score descending
    return scoredOptions.sort((a, b) => b.score - a.score);
  }

  /**
   * Determines if new vehicle dispatch is recommended
   */
  shouldRecommendNewDispatch(
    rankedVehicles: VehicleOption[],
    minAcceptableScore: number = 50,
  ): boolean {
    if (rankedVehicles.length === 0) return true;
    
    const bestScore = rankedVehicles[0].score;
    return bestScore < minAcceptableScore;
  }

  private calculateRouteEfficiencyScore(routeDeviation: number): number {
    // Score decreases as route deviation increases
    // Perfect score (100) for 0km deviation, decreasing to 0 at 20km deviation
    const maxDeviation = 20; // km
    const score = Math.max(0, 100 - (routeDeviation / maxDeviation) * 100);
    return Math.round(score);
  }

  private calculateCapacityUtilizationScore(
    request: DecisionRequest,
    capacity: any,
  ): number {
    const parcelVolume = request.dimensions.length * request.dimensions.width * request.dimensions.height;
    const newWeight = capacity.currentWeight + request.weight;
    const newVolume = capacity.currentVolume + parcelVolume;

    const weightUtilization = newWeight / capacity.maxWeight;
    const volumeUtilization = newVolume / capacity.maxVolume;
    const maxUtilization = Math.max(weightUtilization, volumeUtilization);

    // Optimal utilization is around 80-85%
    // Score is highest at 80% utilization, decreasing as it moves away from optimal
    const optimalUtilization = 0.80;
    const utilizationDifference = Math.abs(maxUtilization - optimalUtilization);
    
    // Score decreases as we move away from optimal utilization
    const score = Math.max(0, 100 - (utilizationDifference * 200));
    return Math.round(score);
  }

  private calculateDeliveryTimeScore(
    slaDeadline: Date,
    estimatedDeliveryTime: Date,
  ): number {
    const timeToSLA = slaDeadline.getTime() - estimatedDeliveryTime.getTime();
    const hoursToSLA = timeToSLA / (1000 * 60 * 60);

    if (hoursToSLA < 0) {
      // Delivery after SLA deadline - very low score
      return 0;
    }

    // Score increases with more buffer time, but with diminishing returns
    // Perfect score for 4+ hours buffer, decreasing as buffer decreases
    const maxBufferHours = 4;
    const score = Math.min(100, (hoursToSLA / maxBufferHours) * 100);
    return Math.round(score);
  }

  private calculateVehicleEligibilityScore(vehicle: Vehicle): number {
    // Convert eligibility score (0-1) to 0-100 scale
    return Math.round(vehicle.eligibilityScore * 100);
  }

  private calculateNewCapacityUtilization(
    request: DecisionRequest,
    capacity: any,
  ): number {
    const parcelVolume = request.dimensions.length * request.dimensions.width * request.dimensions.height;
    const newWeight = capacity.currentWeight + request.weight;
    const newVolume = capacity.currentVolume + parcelVolume;

    const weightUtilization = newWeight / capacity.maxWeight;
    const volumeUtilization = newVolume / capacity.maxVolume;
    
    return Math.max(weightUtilization, volumeUtilization) * 100;
  }
}