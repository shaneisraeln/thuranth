export interface OverrideRequest {
  decisionId: string;
  parcelId: string;
  requestedVehicleId?: string;
  reason: string;
  justification: string;
  requestedBy: string;
  bypassesSLA: boolean;
  riskLevel: OverrideRiskLevel;
  impactAssessment?: OverrideImpactAssessment;
}

export interface OverrideResponse {
  overrideId: string;
  status: OverrideStatus;
  approvalChain: ApprovalStep[];
  estimatedApprovalTime?: Date;
  message: string;
}

export interface ApprovalStep {
  id: string;
  approverRole: string;
  approverUserId?: string;
  status: ApprovalStatus;
  comments?: string;
  timestamp?: Date;
  required: boolean;
}

export interface OverrideImpactAssessment {
  slaRisk: SLARiskAssessment;
  capacityImpact: CapacityImpactAssessment;
  routeImpact: RouteImpactAssessment;
  costImpact: CostImpactAssessment;
  overallRiskScore: number;
  recommendations: string[];
}

export interface SLARiskAssessment {
  affectedParcels: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDelayMinutes: number;
  mitigationOptions: string[];
}

export interface CapacityImpactAssessment {
  vehicleId: string;
  currentUtilization: number;
  projectedUtilization: number;
  exceedsCapacity: boolean;
  alternativeVehicles: string[];
}

export interface RouteImpactAssessment {
  additionalDistance: number;
  additionalTime: number;
  fuelCostIncrease: number;
  emissionsIncrease: number;
}

export interface CostImpactAssessment {
  additionalFuelCost: number;
  potentialPenalties: number;
  operationalCostIncrease: number;
  totalEstimatedCost: number;
}

export enum OverrideStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped'
}

export enum OverrideRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface OverrideAuthorizationConfig {
  lowRisk: {
    requiredApprovers: string[];
    timeoutMinutes: number;
  };
  mediumRisk: {
    requiredApprovers: string[];
    timeoutMinutes: number;
  };
  highRisk: {
    requiredApprovers: string[];
    timeoutMinutes: number;
  };
  criticalRisk: {
    requiredApprovers: string[];
    timeoutMinutes: number;
  };
}