import { Test, TestingModule } from '@nestjs/testing';
import { ExplanationService } from './explanation.service';
import { DecisionRequest, Vehicle, VehicleOption, VehicleType, VehicleStatus } from '@pdcp/types';

describe('ExplanationService', () => {
  let service: ExplanationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExplanationService],
    }).compile();

    service = module.get<ExplanationService>(ExplanationService);
  });

  const createMockRequest = (): DecisionRequest => ({
    parcelId: 'parcel-1',
    pickupLocation: { latitude: 12.9716, longitude: 77.5946 },
    deliveryLocation: { latitude: 12.9352, longitude: 77.6245 },
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    weight: 5,
    dimensions: { length: 30, width: 20, height: 15 },
    priority: 'MEDIUM',
  });

  const createMockVehicle = (id: string = 'vehicle-1'): Vehicle => ({
    id,
    registrationNumber: 'KA01AB1234',
    type: '4W' as VehicleType,
    driverId: 'driver-1',
    capacity: {
      maxWeight: 100,
      maxVolume: 1000000,
      currentWeight: 40,
      currentVolume: 400000,
      utilizationPercentage: 40,
    },
    currentLocation: { latitude: 12.9716, longitude: 77.5946 },
    currentRoute: [],
    status: 'AVAILABLE' as VehicleStatus,
    eligibilityScore: 0.8,
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockVehicleEvaluation = (vehicle: Vehicle, constraintsSatisfied: boolean = true) => ({
    vehicle,
    routeCalculation: {
      totalDistance: 15,
      totalDuration: 30,
      estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      routeDeviation: 3,
    },
    hardConstraints: [
      {
        name: 'VEHICLE_CAPACITY',
        type: 'HARD' as const,
        satisfied: constraintsSatisfied,
        value: 0.45,
        threshold: 0.95,
        description: 'Vehicle capacity constraint',
      },
      {
        name: 'SLA_SAFETY_MARGIN',
        type: 'HARD' as const,
        satisfied: constraintsSatisfied,
        value: 120,
        threshold: 30,
        description: 'SLA safety margin constraint',
      },
    ],
    softConstraints: [
      {
        name: 'OPTIMAL_CAPACITY',
        type: 'SOFT' as const,
        satisfied: true,
        value: 0.45,
        threshold: 0.9,
        description: 'Optimal capacity constraint',
      },
    ],
    constraintsSatisfied,
  });

  describe('generateDetailedExplanation', () => {
    it('should generate explanation for successful vehicle assignment', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const vehicleEvaluations = [createMockVehicleEvaluation(vehicle, true)];
      const alternatives: VehicleOption[] = [
        {
          vehicleId: 'vehicle-1',
          score: 85.5,
          estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          routeDeviation: 3,
          capacityUtilization: 45,
        },
      ];

      const explanation = service.generateDetailedExplanation(
        request,
        'vehicle-1',
        alternatives,
        vehicleEvaluations,
        false,
      );

      expect(explanation.reasoning).toContain('Vehicle vehicle-1');
      expect(explanation.reasoning).toContain('score of 85.5/100');
      expect(explanation.reasoning).toContain('Route Impact');
      expect(explanation.reasoning).toContain('Capacity Analysis');
      expect(explanation.reasoning).toContain('SLA Compliance');
      expect(explanation.hardConstraints).toHaveLength(2);
      expect(explanation.softConstraints).toHaveLength(1);
      expect(explanation.riskAssessment).toBeDefined();
      expect(explanation.riskAssessment.overallRisk).toBeLessThan(0.5);
    });

    it('should generate explanation for new dispatch recommendation', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const vehicleEvaluations = [createMockVehicleEvaluation(vehicle, false)]; // Constraints not satisfied
      const alternatives: VehicleOption[] = [
        {
          vehicleId: 'vehicle-1',
          score: 0, // Zero score due to constraint violations
          estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          routeDeviation: 3,
          capacityUtilization: 45,
        },
      ];

      const explanation = service.generateDetailedExplanation(
        request,
        undefined,
        alternatives,
        vehicleEvaluations,
        true,
      );

      expect(explanation.reasoning).toContain('New Vehicle Dispatch Recommended');
      expect(explanation.reasoning).toContain('Analysis Summary');
      expect(explanation.reasoning).toContain('Constraint Violations');
      expect(explanation.reasoning).toContain('Recommendation');
      expect(explanation.riskAssessment.overallRisk).toBeGreaterThan(0.2);
      expect(explanation.riskAssessment.riskFactors).toContain('New vehicle dispatch increases delivery uncertainty');
    });

    it('should generate explanation when no vehicles are available', () => {
      const request = createMockRequest();
      const vehicleEvaluations: any[] = [];
      const alternatives: VehicleOption[] = [];

      const explanation = service.generateDetailedExplanation(
        request,
        undefined,
        alternatives,
        vehicleEvaluations,
        true,
      );

      expect(explanation.reasoning).toContain('No vehicles are currently available');
      expect(explanation.reasoning).toContain('new vehicle dispatch is required');
      expect(explanation.hardConstraints).toHaveLength(0);
      expect(explanation.softConstraints).toHaveLength(0);
    });

    it('should generate explanation for vehicles meeting constraints but low scores', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const vehicleEvaluations = [createMockVehicleEvaluation(vehicle, true)];
      const alternatives: VehicleOption[] = [
        {
          vehicleId: 'vehicle-1',
          score: 35, // Low score but constraints satisfied
          estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          routeDeviation: 8,
          capacityUtilization: 85,
        },
      ];

      const explanation = service.generateDetailedExplanation(
        request,
        undefined,
        alternatives,
        vehicleEvaluations,
        true,
      );

      expect(explanation.reasoning).toContain('Quality Assessment');
      expect(explanation.reasoning).toContain('scores fall below the acceptable threshold');
      expect(explanation.reasoning).toContain('Top Alternative Analysis');
      expect(explanation.reasoning).toContain('below 50.0 threshold');
    });

    it('should calculate appropriate risk levels', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const vehicleEvaluations = [createMockVehicleEvaluation(vehicle, true)];
      const alternatives: VehicleOption[] = [
        {
          vehicleId: 'vehicle-1',
          score: 75,
          estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now (tight)
          routeDeviation: 9, // High deviation
          capacityUtilization: 92, // Near capacity
        },
      ];

      const explanation = service.generateDetailedExplanation(
        request,
        'vehicle-1',
        alternatives,
        vehicleEvaluations,
        false,
      );

      expect(explanation.riskAssessment.slaRisk).toBeGreaterThan(0.5);
      expect(explanation.riskAssessment.capacityRisk).toBeGreaterThan(0.8);
      expect(explanation.riskAssessment.routeRisk).toBeGreaterThan(0.5);
      expect(explanation.riskAssessment.riskFactors.length).toBeGreaterThan(0);
    });
  });
});