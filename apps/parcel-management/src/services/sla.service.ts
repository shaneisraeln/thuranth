import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ParcelEntity } from '../entities/parcel.entity';
import { ParcelStatus, GeoCoordinate } from '@pdcp/types';

export interface SLAValidationResult {
  isValid: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeToDeadline: number; // minutes
  estimatedDeliveryTime: number; // minutes
  safetyMargin: number; // minutes
  riskFactors: string[];
}

export interface DeliveryTimeImpact {
  originalETA: Date;
  newETA: Date;
  additionalTime: number; // minutes
  routeDeviation: number; // km
  impactLevel: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | 'SEVERE';
}

export interface SLARiskAlert {
  parcelId: string;
  trackingNumber: string;
  riskLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeToDeadline: number; // minutes
  estimatedDeliveryTime: number; // minutes
  riskFactors: string[];
  recommendedActions: string[];
}

@Injectable()
export class SLAService {
  private readonly logger = new Logger(SLAService.name);
  
  // Configuration constants
  private readonly DEFAULT_SAFETY_MARGIN_MINUTES = 60; // 1 hour safety margin
  private readonly AVERAGE_SPEED_KMH = 25; // Average delivery speed in urban areas
  private readonly PICKUP_TIME_MINUTES = 15; // Average time for pickup
  private readonly DELIVERY_TIME_MINUTES = 10; // Average time for delivery
  private readonly TRAFFIC_BUFFER_MULTIPLIER = 1.3; // 30% buffer for traffic

  constructor(
    @InjectRepository(ParcelEntity)
    private readonly parcelRepository: Repository<ParcelEntity>,
  ) {}

  /**
   * Calculate SLA deadline based on pickup time and service level
   */
  calculateSLADeadline(
    pickupTime: Date,
    serviceLevel: 'STANDARD' | 'EXPRESS' | 'SAME_DAY' = 'STANDARD'
  ): Date {
    const deadline = new Date(pickupTime);
    
    switch (serviceLevel) {
      case 'SAME_DAY':
        deadline.setHours(23, 59, 59, 999); // End of same day
        break;
      case 'EXPRESS':
        deadline.setHours(deadline.getHours() + 4); // 4 hours
        break;
      case 'STANDARD':
      default:
        deadline.setDate(deadline.getDate() + 1); // Next day
        deadline.setHours(18, 0, 0, 0); // 6 PM next day
        break;
    }
    
    return deadline;
  }

  /**
   * Validate if a parcel assignment meets SLA requirements
   */
  async validateSLA(
    parcelId: string,
    currentLocation: GeoCoordinate,
    estimatedRouteDistance: number, // km
    safetyMarginMinutes: number = this.DEFAULT_SAFETY_MARGIN_MINUTES
  ): Promise<SLAValidationResult> {
    const parcel = await this.parcelRepository.findOne({ where: { id: parcelId } });
    if (!parcel) {
      throw new Error(`Parcel ${parcelId} not found`);
    }

    const now = new Date();
    const timeToDeadline = Math.floor((parcel.slaDeadline.getTime() - now.getTime()) / (1000 * 60));
    
    // Calculate estimated delivery time
    const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
      currentLocation,
      parcel.pickupLocation,
      parcel.deliveryLocation,
      estimatedRouteDistance
    );

    const actualSafetyMargin = timeToDeadline - estimatedDeliveryTime;
    const riskFactors: string[] = [];
    
    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    let isValid = true;

    if (actualSafetyMargin < 0) {
      riskLevel = 'CRITICAL';
      isValid = false;
      riskFactors.push('Estimated delivery time exceeds SLA deadline');
    } else if (actualSafetyMargin < safetyMarginMinutes * 0.5) {
      riskLevel = 'HIGH';
      riskFactors.push('Very tight delivery window');
    } else if (actualSafetyMargin < safetyMarginMinutes) {
      riskLevel = 'MEDIUM';
      riskFactors.push('Limited safety margin');
    } else {
      riskLevel = 'LOW';
    }

    // Additional risk factors
    if (parcel.priority === 'URGENT' || parcel.priority === 'HIGH') {
      riskFactors.push('High priority parcel requires extra attention');
    }

    if (estimatedRouteDistance > 50) {
      riskFactors.push('Long delivery route increases risk');
    }

    const currentHour = now.getHours();
    if (currentHour >= 17 || currentHour <= 8) {
      riskFactors.push('Delivery during off-peak hours may have delays');
    }

    return {
      isValid,
      riskLevel,
      timeToDeadline,
      estimatedDeliveryTime,
      safetyMargin: actualSafetyMargin,
      riskFactors,
    };
  }

  /**
   * Calculate delivery time impact when adding a parcel to existing route
   */
  calculateDeliveryTimeImpact(
    originalRoute: GeoCoordinate[],
    newPickupLocation: GeoCoordinate,
    newDeliveryLocation: GeoCoordinate,
    originalETA: Date
  ): DeliveryTimeImpact {
    // Simplified calculation - in real implementation, use routing service
    const originalDistance = this.calculateRouteDistance(originalRoute);
    
    // Find optimal insertion points for pickup and delivery
    const optimizedRoute = this.optimizeRouteWithNewStops(
      originalRoute,
      newPickupLocation,
      newDeliveryLocation
    );
    
    const newDistance = this.calculateRouteDistance(optimizedRoute);
    const routeDeviation = newDistance - originalDistance;
    
    // Calculate additional time
    const additionalTravelTime = (routeDeviation / this.AVERAGE_SPEED_KMH) * 60; // minutes
    const additionalServiceTime = this.PICKUP_TIME_MINUTES + this.DELIVERY_TIME_MINUTES;
    const totalAdditionalTime = (additionalTravelTime + additionalServiceTime) * this.TRAFFIC_BUFFER_MULTIPLIER;
    
    const newETA = new Date(originalETA.getTime() + totalAdditionalTime * 60 * 1000);
    
    // Determine impact level
    let impactLevel: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | 'SEVERE';
    if (totalAdditionalTime <= 15) {
      impactLevel = 'MINIMAL';
    } else if (totalAdditionalTime <= 30) {
      impactLevel = 'MODERATE';
    } else if (totalAdditionalTime <= 60) {
      impactLevel = 'SIGNIFICANT';
    } else {
      impactLevel = 'SEVERE';
    }

    return {
      originalETA,
      newETA,
      additionalTime: Math.round(totalAdditionalTime),
      routeDeviation: Math.round(routeDeviation * 100) / 100,
      impactLevel,
    };
  }

  /**
   * Get parcels at risk of SLA violation
   */
  async getAtRiskParcels(riskThresholdMinutes: number = 120): Promise<SLARiskAlert[]> {
    const riskDeadline = new Date();
    riskDeadline.setMinutes(riskDeadline.getMinutes() + riskThresholdMinutes);

    const atRiskParcels = await this.parcelRepository.find({
      where: {
        status: ParcelStatus.ASSIGNED,
        slaDeadline: LessThan(riskDeadline),
      },
      order: { slaDeadline: 'ASC' },
    });

    const alerts: SLARiskAlert[] = [];

    for (const parcel of atRiskParcels) {
      const now = new Date();
      const timeToDeadline = Math.floor((parcel.slaDeadline.getTime() - now.getTime()) / (1000 * 60));
      
      if (timeToDeadline <= 0) {
        continue; // Already past deadline
      }

      // Estimate delivery time (simplified - would use actual route data)
      const estimatedDeliveryTime = this.estimateRemainingDeliveryTime(parcel);
      
      let riskLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL';
      const riskFactors: string[] = [];
      const recommendedActions: string[] = [];

      if (estimatedDeliveryTime >= timeToDeadline) {
        riskLevel = 'CRITICAL';
        riskFactors.push('Estimated delivery time exceeds deadline');
        recommendedActions.push('Immediate dispatcher intervention required');
        recommendedActions.push('Consider emergency reassignment');
      } else if (estimatedDeliveryTime >= timeToDeadline * 0.8) {
        riskLevel = 'HIGH';
        riskFactors.push('Very tight delivery window');
        recommendedActions.push('Monitor closely');
        recommendedActions.push('Prepare contingency plan');
      } else {
        riskLevel = 'MEDIUM';
        riskFactors.push('Approaching SLA deadline');
        recommendedActions.push('Track progress regularly');
      }

      alerts.push({
        parcelId: parcel.id,
        trackingNumber: parcel.trackingNumber,
        riskLevel,
        timeToDeadline,
        estimatedDeliveryTime,
        riskFactors,
        recommendedActions,
      });
    }

    return alerts;
  }

  /**
   * Generate SLA compliance report
   */
  async generateSLAComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalParcels: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    complianceRate: number;
    averageDeliveryTime: number;
    riskBreakdown: Record<string, number>;
  }> {
    const parcels = await this.parcelRepository.find({
      where: {
        status: ParcelStatus.DELIVERED,
        createdAt: LessThan(endDate),
      },
    });

    const relevantParcels = parcels.filter(p => 
      p.createdAt >= startDate && p.updatedAt <= endDate
    );

    const totalParcels = relevantParcels.length;
    let onTimeDeliveries = 0;
    let totalDeliveryTime = 0;
    const riskBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    for (const parcel of relevantParcels) {
      const deliveryTime = parcel.updatedAt.getTime() - parcel.createdAt.getTime();
      totalDeliveryTime += deliveryTime;

      if (parcel.updatedAt <= parcel.slaDeadline) {
        onTimeDeliveries++;
      }

      // Categorize based on how close to deadline
      const timeToDeadline = parcel.slaDeadline.getTime() - parcel.updatedAt.getTime();
      const timeToDeadlineMinutes = timeToDeadline / (1000 * 60);

      if (timeToDeadlineMinutes < 0) {
        riskBreakdown.CRITICAL++;
      } else if (timeToDeadlineMinutes < 30) {
        riskBreakdown.HIGH++;
      } else if (timeToDeadlineMinutes < 60) {
        riskBreakdown.MEDIUM++;
      } else {
        riskBreakdown.LOW++;
      }
    }

    return {
      totalParcels,
      onTimeDeliveries,
      lateDeliveries: totalParcels - onTimeDeliveries,
      complianceRate: totalParcels > 0 ? (onTimeDeliveries / totalParcels) * 100 : 0,
      averageDeliveryTime: totalParcels > 0 ? totalDeliveryTime / totalParcels / (1000 * 60) : 0, // minutes
      riskBreakdown,
    };
  }

  private calculateEstimatedDeliveryTime(
    currentLocation: GeoCoordinate,
    pickupLocation: GeoCoordinate,
    deliveryLocation: GeoCoordinate,
    routeDistance: number
  ): number {
    // Simplified calculation - in real implementation, use Google Maps API
    const travelTime = (routeDistance / this.AVERAGE_SPEED_KMH) * 60; // minutes
    const serviceTime = this.PICKUP_TIME_MINUTES + this.DELIVERY_TIME_MINUTES;
    const bufferedTime = (travelTime + serviceTime) * this.TRAFFIC_BUFFER_MULTIPLIER;
    
    return Math.round(bufferedTime);
  }

  private calculateRouteDistance(route: GeoCoordinate[]): number {
    // Simplified Haversine distance calculation
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += this.calculateDistance(route[i], route[i + 1]);
    }
    return totalDistance;
  }

  private calculateDistance(point1: GeoCoordinate, point2: GeoCoordinate): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private optimizeRouteWithNewStops(
    originalRoute: GeoCoordinate[],
    newPickup: GeoCoordinate,
    newDelivery: GeoCoordinate
  ): GeoCoordinate[] {
    // Simplified optimization - insert pickup and delivery at optimal positions
    // In real implementation, use proper route optimization algorithms
    const route = [...originalRoute];
    
    // Find best position for pickup (minimize detour)
    let bestPickupIndex = 0;
    let minPickupDetour = Infinity;
    
    for (let i = 0; i <= route.length; i++) {
      const detour = this.calculateInsertionDetour(route, newPickup, i);
      if (detour < minPickupDetour) {
        minPickupDetour = detour;
        bestPickupIndex = i;
      }
    }
    
    route.splice(bestPickupIndex, 0, newPickup);
    
    // Find best position for delivery (after pickup)
    let bestDeliveryIndex = bestPickupIndex + 1;
    let minDeliveryDetour = Infinity;
    
    for (let i = bestPickupIndex + 1; i <= route.length; i++) {
      const detour = this.calculateInsertionDetour(route, newDelivery, i);
      if (detour < minDeliveryDetour) {
        minDeliveryDetour = detour;
        bestDeliveryIndex = i;
      }
    }
    
    route.splice(bestDeliveryIndex, 0, newDelivery);
    
    return route;
  }

  private calculateInsertionDetour(
    route: GeoCoordinate[],
    newPoint: GeoCoordinate,
    insertIndex: number
  ): number {
    if (route.length === 0) return 0;
    if (insertIndex === 0) {
      return this.calculateDistance(newPoint, route[0]);
    }
    if (insertIndex === route.length) {
      return this.calculateDistance(route[route.length - 1], newPoint);
    }
    
    const prevPoint = route[insertIndex - 1];
    const nextPoint = route[insertIndex];
    const originalDistance = this.calculateDistance(prevPoint, nextPoint);
    const newDistance = this.calculateDistance(prevPoint, newPoint) + 
                       this.calculateDistance(newPoint, nextPoint);
    
    return newDistance - originalDistance;
  }

  private estimateRemainingDeliveryTime(parcel: ParcelEntity): number {
    // Simplified estimation - in real implementation, use actual vehicle location and route
    const now = new Date();
    const assignedDuration = now.getTime() - (parcel.assignedAt?.getTime() || now.getTime());
    const assignedHours = assignedDuration / (1000 * 60 * 60);
    
    // Assume average delivery takes 2-4 hours depending on distance and priority
    let baseEstimate = 180; // 3 hours in minutes
    
    if (parcel.priority === 'URGENT') {
      baseEstimate *= 0.7; // Faster for urgent
    } else if (parcel.priority === 'LOW') {
      baseEstimate *= 1.3; // Slower for low priority
    }
    
    // Reduce estimate based on time already spent
    const remainingTime = Math.max(30, baseEstimate - (assignedHours * 60));
    
    return Math.round(remainingTime);
  }
}