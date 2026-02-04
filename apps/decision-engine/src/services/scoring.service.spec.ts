import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from './scoring.service';
import { DecisionRequest, Vehicle, VehicleType, VehicleStatus } from '@pdcp/types';
import { RouteCalculation } from './route-calculator.service';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoringService],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
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

  const createMockVehicle = (overrides?: Partial<Vehicle>): Vehicle => ({
    id: 'vehicle-1',
    registrationNumber: 'KA01AB1234',
    type: '4W' as VehicleType,
    driverId: 'driver-1',
    capacity: {
      maxWeight: 100,
      maxVolume: 1000000,
      currentWeight: 40, // 40% loaded
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
    ...overrides,
  });

  const createMockRouteCalculation = (overrides?: Partial<RouteCalculation>): RouteCalculation => ({
    totalDistance: 15,
    totalDuration: 30,
    estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    routeDeviation: 3, // 3km additional
    ...overrides,
  });

  describe('calculateScore', () => {
    it('should calculate score with all factors', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle();
      const routeCalculation = createMockRouteCalculation();

      const result = service.calculateScore({
        request,
        vehicle,
        routeCalculation,
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors).toHaveLength(4);
      
      const factorNames = result.factors.map(f => f.name);
      expect(factorNames).toContain('Route Efficiency');
      expect(factorNames).toContain('Capacity Utilization');
      expect(factorNames).toContain('Delivery Time Impact');
      expect(factorNames).toContain('Vehicle Eligibility');

      // All factors should have weights that sum to 1
      const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should give high score for optimal conditions', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle({
        capacity: {
          maxWeight: 100,
          maxVolume: 1000000,
          currentWeight: 35, // Will be ~40% after adding 5kg parcel (optimal)
          currentVolume: 350000,
          utilizationPercentage: 35,
        },
        eligibilityScore: 0.95,
      });
      const routeCalculation = createMockRouteCalculation({
        routeDeviation: 1, // Minimal deviation
        estimatedDeliveryTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now (3 hours before SLA)
      });

      const result = service.calculateScore({
        request,
        vehicle,
        routeCalculation,
      });

      expect(result.score).toBeGreaterThan(80); // Should be high score
    });

    it('should give low score for poor conditions', () => {
      const request = createMockRequest();
      const vehicle = createMockVehicle({
        capacity: {
          maxWeight: 100,
          maxVolume: 1000000,
          currentWeight: 90, // Will be 95% after adding 5kg parcel (near max)
          currentVolume: 900000,
          utilizationPercentage: 90,
        },
        eligibilityScore: 0.3, // Low eligibility
      });
      const routeCalculation = createMockRouteCalculation({
        routeDeviation: 15, // High deviation
        estimatedDeliveryTime: new Date(Date.now() + 3.5 * 60 * 60 * 1000), // Close to SLA deadline
      });

      const result = service.calculateScore({
        request,
        vehicle,
        routeCalculation,
      });

      expect(result.score).toBeLessThan(50); // Should be low score
    });
  });

  describe('rankVehicles', () => {
    it('should rank vehicles by score in descending order', () => {
      const request = createMockRequest();
      
      const vehicleOptions = [
        {
          vehicle: createMockVehicle({ id: 'vehicle-1', eligibilityScore: 0.6 }),
          routeCalculation: createMockRouteCalculation({ routeDeviation: 8 }),
          constraintsSatisfied: true,
        },
        {
          vehicle: createMockVehicle({ id: 'vehicle-2', eligibilityScore: 0.9 }),
          routeCalculation: createMockRouteCalculation({ routeDeviation: 2 }),
          constraintsSatisfied: true,
        },
        {
          vehicle: createMockVehicle({ id: 'vehicle-3', eligibilityScore: 0.4 }),
          routeCalculation: createMockRouteCalculation({ routeDeviation: 12 }),
          constraintsSatisfied: true,
        },
      ];

      const ranked = service.rankVehicles(request, vehicleOptions);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
      expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
      expect(ranked[0].vehicleId).toBe('vehicle-2'); // Should be the best vehicle
    });

    it('should give zero score to vehicles that do not satisfy constraints', () => {
      const request = createMockRequest();
      
      const vehicleOptions = [
        {
          vehicle: createMockVehicle({ id: 'vehicle-1' }),
          routeCalculation: createMockRouteCalculation(),
          constraintsSatisfied: false, // Constraints not satisfied
        },
        {
          vehicle: createMockVehicle({ id: 'vehicle-2' }),
          routeCalculation: createMockRouteCalculation(),
          constraintsSatisfied: true,
        },
      ];

      const ranked = service.rankVehicles(request, vehicleOptions);

      expect(ranked[0].vehicleId).toBe('vehicle-2');
      expect(ranked[0].score).toBeGreaterThan(0);
      expect(ranked[1].vehicleId).toBe('vehicle-1');
      expect(ranked[1].score).toBe(0);
    });
  });

  describe('shouldRecommendNewDispatch', () => {
    it('should recommend new dispatch when no vehicles available', () => {
      const result = service.shouldRecommendNewDispatch([]);
      expect(result).toBe(true);
    });

    it('should recommend new dispatch when best score is below threshold', () => {
      const lowScoreVehicles = [
        { vehicleId: 'v1', score: 30, estimatedDeliveryTime: new Date(), routeDeviation: 5, capacityUtilization: 80 },
        { vehicleId: 'v2', score: 25, estimatedDeliveryTime: new Date(), routeDeviation: 8, capacityUtilization: 85 },
      ];

      const result = service.shouldRecommendNewDispatch(lowScoreVehicles, 50);
      expect(result).toBe(true);
    });

    it('should not recommend new dispatch when best score is above threshold', () => {
      const highScoreVehicles = [
        { vehicleId: 'v1', score: 75, estimatedDeliveryTime: new Date(), routeDeviation: 2, capacityUtilization: 70 },
        { vehicleId: 'v2', score: 60, estimatedDeliveryTime: new Date(), routeDeviation: 4, capacityUtilization: 75 },
      ];

      const result = service.shouldRecommendNewDispatch(highScoreVehicles, 50);
      expect(result).toBe(false);
    });
  });
});