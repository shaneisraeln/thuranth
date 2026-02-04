import { GeoCoordinate } from './common.types';

export type VehicleType = '2W' | '4W';
export type VehicleStatus = 'AVAILABLE' | 'ON_ROUTE' | 'OFFLINE' | 'MAINTENANCE';

export enum VehicleTypeEnum {
  TWO_WHEELER = '2W',
  FOUR_WHEELER = '4W'
}

export enum VehicleStatusEnum {
  AVAILABLE = 'AVAILABLE',
  ON_ROUTE = 'ON_ROUTE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface VehicleCapacity {
  maxWeight: number;    // kg
  maxVolume: number;    // cubic cm
  currentWeight: number;
  currentVolume: number;
  utilizationPercentage: number;
}

export interface RoutePoint {
  id: string;
  location: GeoCoordinate;
  address: string;
  estimatedArrival: Date;
  completed: boolean;
  parcelIds: string[];
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  type: VehicleType;
  driverId: string;
  capacity: VehicleCapacity;
  currentLocation: GeoCoordinate;
  currentRoute: RoutePoint[];
  status: VehicleStatus;
  eligibilityScore: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleLocationUpdate {
  vehicleId: string;
  location: GeoCoordinate;
  timestamp: Date;
  speed?: number; // km/h
  heading?: number; // degrees
}

export interface VehicleAssignment {
  vehicleId: string;
  parcelId: string;
  assignedAt: Date;
  estimatedDelivery: Date;
}