import { GeoCoordinate } from './common.types';
import { RoutePoint } from './vehicle.types';

export interface Route {
  id: string;
  vehicleId: string;
  routePoints: RoutePoint[];
  totalDistance: number; // km
  estimatedDuration: number; // minutes
  status: RouteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type RouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface RouteOptimizationRequest {
  vehicleId: string;
  currentLocation: GeoCoordinate;
  deliveryPoints: RoutePoint[];
  constraints?: RouteConstraints;
}

export interface RouteConstraints {
  maxDistance?: number; // km
  maxDuration?: number; // minutes
  timeWindows?: TimeWindow[];
  vehicleCapacity?: number;
}

export interface TimeWindow {
  parcelId: string;
  earliestDelivery: Date;
  latestDelivery: Date;
}

export interface RouteOptimizationResponse {
  optimizedRoute: RoutePoint[];
  totalDistance: number;
  estimatedDuration: number;
  savings: RouteSavings;
}

export interface RouteSavings {
  distanceSaved: number; // km
  timeSaved: number; // minutes
  fuelSaved: number; // liters
  emissionsSaved: number; // kg CO2
}