import { GeoCoordinate, Dimensions, Priority } from './common.types';

export interface DecisionRequest {
  parcelId: string;
  pickupLocation: GeoCoordinate;
  deliveryLocation: GeoCoordinate;
  slaDeadline: Date;
  weight: number;
  dimensions: Dimensions;
  priority: Priority;
}

export interface VehicleOption {
  vehicleId: string;
  score: number;
  estimatedDeliveryTime: Date;
  routeDeviation: number; // additional km
  capacityUtilization: number; // percentage after assignment
}

export interface ConstraintResult {
  name: string;
  type: 'HARD' | 'SOFT';
  satisfied: boolean;
  value: number;
  threshold: number;
  description: string;
}

export interface ScoringFactor {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
}

export interface RiskAssessment {
  slaRisk: number; // 0-1 scale
  capacityRisk: number; // 0-1 scale
  routeRisk: number; // 0-1 scale
  overallRisk: number; // 0-1 scale
  riskFactors: string[];
}

export interface DecisionExplanation {
  hardConstraints: ConstraintResult[];
  softConstraints: ConstraintResult[];
  scoringFactors: ScoringFactor[];
  riskAssessment: RiskAssessment;
  reasoning: string;
}

export interface DecisionResponse {
  requestId: string;
  parcelId: string;
  recommendedVehicleId?: string;
  score: number;
  explanation: DecisionExplanation;
  alternatives: VehicleOption[];
  requiresNewDispatch: boolean;
  shadowMode: boolean;
  timestamp: Date;
}

export interface DecisionRecord {
  id: string;
  parcelId: string;
  requestTimestamp: Date;
  recommendedVehicleId?: string;
  score: number;
  explanation: DecisionExplanation;
  shadowMode: boolean;
  executed: boolean;
  overridden: boolean;
  overrideReason?: string;
  overrideUserId?: string;
  createdAt: Date;
}