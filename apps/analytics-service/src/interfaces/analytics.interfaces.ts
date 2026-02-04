export interface MetricRequest {
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  unit?: string;
  dimensions?: Record<string, any>;
  periodStart: Date;
  periodEnd: Date;
  serviceName?: string;
}

export interface MetricFilter {
  metricName?: string;
  metricType?: string;
  serviceName?: string;
  startDate?: Date;
  endDate?: Date;
  dimensions?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface ConsolidationEvent {
  parcelId: string;
  originalVehicleId?: string;
  consolidatedVehicleId: string;
  distanceSaved: number; // km
  fuelSaved: number; // liters
  co2Saved: number; // kg
  timestamp: Date;
}

export interface VehicleUtilizationData {
  vehicleId: string;
  vehicleType: '2W' | '4W';
  utilizationPercentage: number;
  timestamp: Date;
}

export interface SLAPerformanceData {
  parcelId: string;
  slaDeadline: Date;
  actualDeliveryTime: Date;
  adherenceStatus: 'met' | 'missed' | 'at_risk';
  marginMinutes: number;
}

export interface DecisionPerformanceData {
  decisionId: string;
  processingTimeMs: number;
  shadowMode: boolean;
  executed: boolean;
  overridden: boolean;
  timestamp: Date;
}

export interface AnalyticsReport {
  period: {
    start: Date;
    end: Date;
  };
  primaryMetrics: {
    vehiclesAvoided: number;
    totalParcelsProcessed: number;
    consolidationRate: number;
  };
  utilizationMetrics: {
    avgVehicleUtilization: number;
    totalDistanceSaved: number;
    totalFuelSaved: number;
  };
  environmentalImpact: {
    co2EmissionsSaved: number;
    emissionsPerParcel: number;
  };
  slaMetrics: {
    adherenceRate: number;
    avgDeliveryTime: number;
    riskEvents: number;
  };
  decisionEngineMetrics: {
    avgDecisionTime: number;
    shadowModeAccuracy: number;
    manualOverrideRate: number;
  };
  trends: {
    consolidationRateTrend: number;
    utilizationTrend: number;
    slaAdherenceTrend: number;
  };
}

export interface CustomMetricDefinition {
  name: string;
  description: string;
  formula: string;
  unit: string;
  category: string;
  dependencies: string[];
}

export interface EmissionsCalculationParams {
  vehicleType: '2W' | '4W';
  distanceKm: number;
  fuelType?: 'petrol' | 'diesel' | 'electric';
}

export interface EmissionsResult {
  co2Kg: number;
  fuelLiters: number;
  calculationMethod: string;
}