import { GeoCoordinate, ContactInfo, Dimensions, Priority } from './common.types';
import { CustodyRecord } from './custody.types';

export enum ParcelStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  sender: ContactInfo;
  recipient: ContactInfo;
  pickupLocation: GeoCoordinate;
  deliveryLocation: GeoCoordinate;
  slaDeadline: Date;
  weight: number; // kg
  dimensions: Dimensions;
  value: number; // currency value
  priority: Priority;
  status: ParcelStatus;
  assignedVehicleId?: string;
  assignedAt?: Date;
  custodyChain: CustodyRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParcelAssignmentRequest {
  parcelId: string;
  pickupLocation: GeoCoordinate;
  deliveryLocation: GeoCoordinate;
  slaDeadline: Date;
  weight: number;
  dimensions: Dimensions;
  priority: Priority;
}

export interface ParcelStatusUpdate {
  parcelId: string;
  status: ParcelStatus;
  location?: GeoCoordinate;
  timestamp: Date;
  notes?: string;
}