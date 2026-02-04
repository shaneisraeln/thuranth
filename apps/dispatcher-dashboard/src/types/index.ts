// Core types for the dispatcher dashboard
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email?: string;
}

export type VehicleType = '2W' | '4W';
export type VehicleStatus = 'available' | 'on_route' | 'delivering' | 'offline';
export type ParcelStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface VehicleCapacity {
  maxWeight: number;
  maxVolume: number;
  currentWeight: number;
  currentVolume: number;
  utilizationPercentage: number;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  type: VehicleType;
  driverId: string;
  driverName: string;
  capacity: VehicleCapacity;
  currentLocation: GeoCoordinate;
  status: VehicleStatus;
  eligibilityScore: number;
  lastUpdated: Date;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  sender: ContactInfo;
  recipient: ContactInfo;
  pickupLocation: GeoCoordinate;
  deliveryLocation: GeoCoordinate;
  slaDeadline: Date;
  weight: number;
  dimensions: Dimensions;
  status: ParcelStatus;
  priority: Priority;
  assignedVehicleId?: string;
  createdAt: Date;
}

export interface ConstraintResult {
  name: string;
  passed: boolean;
  value: number;
  threshold: number;
  description: string;
}

export interface ScoringFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigation: string[];
}

export interface DecisionExplanation {
  hardConstraints: ConstraintResult[];
  softConstraints: ConstraintResult[];
  scoringFactors: ScoringFactor[];
  riskAssessment: RiskAssessment;
}

export interface VehicleOption {
  vehicleId: string;
  score: number;
  explanation: DecisionExplanation;
}

export interface Decision {
  id: string;
  parcelId: string;
  requestTimestamp: Date;
  recommendedVehicleId?: string;
  score: number;
  explanation: DecisionExplanation;
  alternatives: VehicleOption[];
  requiresNewDispatch: boolean;
  shadowMode: boolean;
  executed: boolean;
  overridden: boolean;
  overrideReason?: string;
  overrideUserId?: string;
}

export interface ManualOverride {
  parcelId: string;
  vehicleId?: string;
  reason: string;
  justification: string;
  riskAcknowledged: boolean;
}

export interface Metrics {
  vehiclesAvoided: number;
  utilizationImprovement: number;
  emissionsSaved: number;
  fuelSavings: number;
  slaAdherence: number;
  totalParcelsConsolidated: number;
}

export interface DashboardState {
  vehicles: Vehicle[];
  parcels: Parcel[];
  pendingParcels: Parcel[];
  decisions: Decision[];
  metrics: Metrics;
  selectedVehicle?: Vehicle;
  selectedParcel?: Parcel;
  mapCenter: GeoCoordinate;
  mapZoom: number;
  isLoading: boolean;
  error?: string;
}