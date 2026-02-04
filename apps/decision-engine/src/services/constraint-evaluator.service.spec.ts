import { Test, TestingModule } from '@nestjs/testing';
import { ConstraintEvaluatorService } from './constraint-evaluator.service';
import { DecisionRequest, Vehicle, VehicleCapacity, VehicleType, VehicleStatus } from '@pdcp/types';

describe('ConstraintEvaluatorService', () => {
  let service: ConstraintEvaluatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConstraintEvaluatorService],
    }).compile();

    service = module.get<ConstraintEvaluatorService>(ConstraintEvaluatorService);
  });

  const createMockRequest = (): DecisionRequest => ({
    parcelId: 'parcel-1',
    pickupLocation: { latitude: 12.9716, longitude: 77.5946 },
    deliveryLocation: { latitude: 12.9352, longitude: 77.6245 },
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    weight: 5,
    dimensions: { length: 30, width: 20, height: 15 },
    priority: 'MEDIUM',
  });

  const createMockVehicle = (capacity?: Partial<VehicleCapacity>): Vehicle => ({
    id: 'vehicle-1',
    registrationNumber: 'KA01AB1234',
    type: '4W' as VehicleType,
    driverId: 'driver-1',
    capacity: {
      maxWeight: 100,
      maxVolume: 1000000, // 1 cubic meter in cubic cm
      currentWeight: 20,
      currentVolume: 200000,
      utilizationPercentage: 20,
      ...capacity,
    },
    currentLocation: { latitude: 12.9716, longitude: 77.5946 },
    currentRoute: [],
    status: 'AVAILABLE' as VehicleStatus,
    eligibilityScore: 0.8,
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('evaluateHardConstraints', () => {
    it('should pass all hard constraints for valid assignment', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const routeDeviation = 5; // 5km deviation

      const constraints = service.evaluateHardConstraints(
        request,
        vehicle,
        estimatedDeliveryTime,
        routeDeviation,
      );

      expect(constraints).toHaveLength(3);
      expect(constraints.every(c => c.satisfied)).toBe(true);
      expect(constraints.every(c => c.type === 'HARD')).toBe(true);
    });

    it('should fail capacity constraint when vehicle is overloaded', () => {
      const request = createMockRequest();
      request.weight = 80; // Heavy parcel
      const vehicle = createMockVehicle({ currentWeight: 50 }); // Already 50kg loaded
      const estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000);
      const routeDeviation = 5;

      const constraints = service.evaluateHardConstraints(
        request,
        vehicle,
        estimatedDeliveryTime,
        routeDeviation,
      );

      const capacityConstraint = constraints.find(c => c.name === 'VEHICLE_CAPACITY');
      expect(capacityConstraint?.satisfied).toBe(false);
      expect(capacityConstraint?.value).toBeGreaterThan(capacityConstraint?.threshold);
    });

    it('should fail SLA constraint when delivery time is too close to deadline', () => {
      const request = createMockRequest();
      request.slaDeadline = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now
      const vehicle = createMockVehicle();
      const estimatedDeliveryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      const routeDeviation = 5;

      const constraints = service.evaluateHardConstraints(
        request,
        vehicle,
        estimatedDeliveryTime,
        routeDeviation,
      );

      const slaConstraint = constraints.find(c => c.name === 'SLA_SAFETY_MARGIN');
      expect(slaConstraint?.satisfied).toBe(false);
    });

    it('should fail route deviation constraint when deviation is too high', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000);
      const routeDeviation = 15; // 15km deviation (exceeds 10km limit)

      const constraints = service.evaluateHardConstraints(
        request,
        vehicle,
        estimatedDeliveryTime,
        routeDeviation,
      );

      const routeConstraint = constraints.find(c => c.name === 'ROUTE_DEVIATION');
      expect(routeConstraint?.satisfied).toBe(false);
      expect(routeConstraint?.value).toBe(15);
      expect(routeConstraint?.threshold).toBe(10);
    });
  });

  describe('evaluateSoftConstraints', () => {
    it('should evaluate soft constraints for optimization', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000);
      const routeDeviation = 3;

      const constraints = service.evaluateSoftConstraints(
        request,
        vehicle,
        estimatedDeliveryTime,
        routeDeviation,
      );

      expect(constraints).toHaveLength(3);
      expect(constraints.every(c => c.type === 'SOFT')).toBe(true);
      
      const names = constraints.map(c => c.name);
      expect(names).toContain('OPTIMAL_CAPACITY');
      expect(names).toContain('ROUTE_EFFICIENCY');
      expect(names).toContain('SLA_BUFFER_OPTIMIZATION');
    });
  });

  describe('areHardConstraintsSatisfied', () => {
    it('should return true when all hard constraints are satisfied', () => {
      const constraints = [
        { name: 'TEST1', type: 'HARD' as const, satisfied: true, value: 0.5, threshold: 1, description: 'Test' },
        { name: 'TEST2', type: 'HARD' as const, satisfied: true, value: 0.8, threshold: 1, description: 'Test' },
      ];

      expect(service.areHardConstraintsSatisfied(constraints)).toBe(true);
    });

    it('should return false when any hard constraint is not satisfied', () => {
      const constraints = [
        { name: 'TEST1', type: 'HARD' as const, satisfied: true, value: 0.5, threshold: 1, description: 'Test' },
        { name: 'TEST2', type: 'HARD' as const, satisfied: false, value: 1.2, threshold: 1, description: 'Test' },
      ];

      expect(service.areHardConstraintsSatisfied(constraints)).toBe(false);
    });
  });

  describe('calculateRiskAssessment', () => {
    it('should calculate low risk for satisfied constraints', () => {
      const hardConstraints = [
        { name: 'SLA_SAFETY_MARGIN', type: 'HARD' as const, satisfied: true, value: 60, threshold: 30, description: 'Test' },
        { name: 'VEHICLE_CAPACITY', type: 'HARD' as const, satisfied: true, value: 0.7, threshold: 0.95, description: 'Test' },
        { name: 'ROUTE_DEVIATION', type: 'HARD' as const, satisfied: true, value: 3, threshold: 10, description: 'Test' },
      ];

      const riskAssessment = service.calculateRiskAssessment(hardConstraints, []);

      expect(riskAssessment.overallRisk).toBeLessThan(0.5);
      expect(riskAssessment.riskFactors).toHaveLength(0);
    });

    it('should calculate high risk for violated constraints', () => {
      const hardConstraints = [
        { name: 'SLA_SAFETY_MARGIN', type: 'HARD' as const, satisfied: false, value: 10, threshold: 30, description: 'Test' },
        { name: 'VEHICLE_CAPACITY', type: 'HARD' as const, satisfied: false, value: 0.98, threshold: 0.95, description: 'Test' },
        { name: 'ROUTE_DEVIATION', type: 'HARD' as const, satisfied: false, value: 12, threshold: 10, description: 'Test' },
      ];

      const riskAssessment = service.calculateRiskAssessment(hardConstraints, []);

      expect(riskAssessment.overallRisk).toBeGreaterThan(0.7);
      expect(riskAssessment.riskFactors.length).toBeGreaterThan(0);
    });
  });
});