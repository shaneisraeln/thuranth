import { Injectable } from '@nestjs/common';
import { GeoCoordinate, RoutePoint } from '@pdcp/types';

export interface RouteCalculation {
  totalDistance: number; // km
  totalDuration: number; // minutes
  estimatedDeliveryTime: Date;
  routeDeviation: number; // additional km from original route
}

@Injectable()
export class RouteCalculatorService {
  /**
   * Calculates route metrics when adding a parcel to a vehicle's route
   */
  async calculateRouteWithParcel(
    currentRoute: RoutePoint[],
    pickupLocation: GeoCoordinate,
    deliveryLocation: GeoCoordinate,
    currentTime: Date = new Date(),
  ): Promise<RouteCalculation> {
    // For now, using simplified distance calculation
    // In production, this would integrate with Google Maps API
    
    const originalDistance = this.calculateOriginalRouteDistance(currentRoute);
    const newRoute = this.optimizeRouteWithNewStops(
      currentRoute,
      pickupLocation,
      deliveryLocation,
    );
    
    const newDistance = this.calculateRouteDistance(newRoute);
    const routeDeviation = newDistance - originalDistance;
    
    // Estimate duration based on distance (assuming average speed of 30 km/h in urban areas)
    const averageSpeedKmh = 30;
    const totalDuration = (newDistance / averageSpeedKmh) * 60; // minutes
    
    const estimatedDeliveryTime = new Date(
      currentTime.getTime() + totalDuration * 60 * 1000,
    );

    return {
      totalDistance: newDistance,
      totalDuration,
      estimatedDeliveryTime,
      routeDeviation,
    };
  }

  /**
   * Calculates the distance of the original route
   */
  private calculateOriginalRouteDistance(route: RoutePoint[]): number {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += this.calculateDistance(
        route[i].location,
        route[i + 1].location,
      );
    }
    
    return totalDistance;
  }

  /**
   * Optimizes route by inserting pickup and delivery stops
   */
  private optimizeRouteWithNewStops(
    currentRoute: RoutePoint[],
    pickupLocation: GeoCoordinate,
    deliveryLocation: GeoCoordinate,
  ): GeoCoordinate[] {
    // Simple optimization: find best insertion points for pickup and delivery
    // In production, this would use more sophisticated routing algorithms
    
    const routePoints = currentRoute.map(point => point.location);
    
    if (routePoints.length === 0) {
      return [pickupLocation, deliveryLocation];
    }

    // Find best insertion point for pickup
    let bestPickupIndex = 0;
    let minPickupCost = Infinity;
    
    for (let i = 0; i <= routePoints.length; i++) {
      const cost = this.calculateInsertionCost(routePoints, pickupLocation, i);
      if (cost < minPickupCost) {
        minPickupCost = cost;
        bestPickupIndex = i;
      }
    }

    // Insert pickup point
    const routeWithPickup = [...routePoints];
    routeWithPickup.splice(bestPickupIndex, 0, pickupLocation);

    // Find best insertion point for delivery (must be after pickup)
    let bestDeliveryIndex = bestPickupIndex + 1;
    let minDeliveryCost = Infinity;
    
    for (let i = bestPickupIndex + 1; i <= routeWithPickup.length; i++) {
      const cost = this.calculateInsertionCost(routeWithPickup, deliveryLocation, i);
      if (cost < minDeliveryCost) {
        minDeliveryCost = cost;
        bestDeliveryIndex = i;
      }
    }

    // Insert delivery point
    routeWithPickup.splice(bestDeliveryIndex, 0, deliveryLocation);
    
    return routeWithPickup;
  }

  /**
   * Calculates the cost of inserting a point at a specific index
   */
  private calculateInsertionCost(
    route: GeoCoordinate[],
    newPoint: GeoCoordinate,
    insertIndex: number,
  ): number {
    if (route.length === 0) return 0;
    
    let cost = 0;
    
    // Cost of going to the new point
    if (insertIndex > 0) {
      cost += this.calculateDistance(route[insertIndex - 1], newPoint);
    }
    
    // Cost of going from the new point to the next point
    if (insertIndex < route.length) {
      cost += this.calculateDistance(newPoint, route[insertIndex]);
      
      // Subtract the original direct cost between the two points
      if (insertIndex > 0) {
        cost -= this.calculateDistance(route[insertIndex - 1], route[insertIndex]);
      }
    }
    
    return cost;
  }

  /**
   * Calculates total distance for a route
   */
  private calculateRouteDistance(route: GeoCoordinate[]): number {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += this.calculateDistance(route[i], route[i + 1]);
    }
    
    return totalDistance;
  }

  /**
   * Calculates distance between two coordinates using Haversine formula
   */
  private calculateDistance(point1: GeoCoordinate, point2: GeoCoordinate): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}