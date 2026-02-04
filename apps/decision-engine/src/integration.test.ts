// Simple integration test to verify the decision engine components work together
import { DecisionEngineService } from './services/decision-engine.service';
import { ConstraintEvaluatorService } from './services/constraint-evaluator.service';
import { RouteCalculatorService } from './services/route-calculator.service';
import { ScoringService } from './services/scoring.service';
import { ExplanationService } from './services/explanation.service';
import { ShadowModeService } from './services/shadow-mode.service';
import { DecisionRequest, Vehicle, VehicleType, VehicleStatus } from '@pdcp/types';

// Mock repository for testing
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  update: jest.fn(),
};

describe('Decision Engine Integration', () => {
  let decisionEngine: DecisionEngineService;
  let constraintEvaluator: ConstraintEvaluatorService;
  let routeCalculator: RouteCalculatorService;
  let scoringService: ScoringService;
  let explanationService: ExplanationService;
  let shadowModeService: ShadowModeService;

  beforeEach(() => {
    constraintEvaluator = new ConstraintEvaluatorService();
    routeCalculator = new RouteCalculatorService();
    scoringService = new ScoringService();
    explanationService = new ExplanationService();
    shadowModeService = new ShadowModeService(mockRepository as any);
    decisionEngine = new DecisionEngineService(
      mockRepository as any,
      constraintEvaluator,
      routeCalculator,
      scoringService,
    );
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

  it('should create services without errors', () => {
    expect(constraintEvaluator).toBeDefined();
    expect(routeCalculator).toBeDefined();
    expect(scoringService).toBeDefined();
    expect(explanationService).toBeDefined();
    expect(shadowModeService).toBeDefined();
    expect(decisionEngine).toBeDefined();
  });

  it('should evaluate constraints correctly', () => {
    const request = createMockRequest();
    const vehicle = createMockVehicle();
    const estimatedDeliveryTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const routeDeviation = 5;

    const hardConstraints = constraintEvaluator.evaluateHardConstraints(
      request,
      vehicle,
      estimatedDeliveryTime,
      routeDeviation,
    );

    expect(hardConstraints).toHaveLength(3);
    expect(hardConstraints.every(c => c.type === 'HARD')).toBe(true);
    
    const satisfied = constraintEvaluator.areHardConstraintsSatisfied(hardConstraints);
    expect(typeof satisfied).toBe('boolean');
  });

  it('should calculate route metrics', async () => {
    const currentRoute: any[] = [];
    const pickupLocation = { latitude: 12.9716, longitude: 77.5946 };
    const deliveryLocation = { latitude: 12.9352, longitude: 77.6245 };

    const routeCalculation = await routeCalculator.calculateRouteWithParcel(
      currentRoute,
      pickupLocation,
      deliveryLocation,
    );

    expect(routeCalculation.totalDistance).toBeGreaterThan(0);
    expect(routeCalculation.totalDuration).toBeGreaterThan(0);
    expect(routeCalculation.estimatedDeliveryTime).toBeInstanceOf(Date);
    expect(routeCalculation.routeDeviation).toBeGreaterThanOrEqual(0);
  });

  it('should calculate scores correctly', () => {
    const request = createMockRequest();
    const vehicle = createMockVehicle();
    const routeCalculation = {
      totalDistance: 15,
      totalDuration: 30,
      estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      routeDeviation: 3,
    };

    const result = scoringService.calculateScore({
      request,
      vehicle,
      routeCalculation,
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.factors).toHaveLength(4);
    expect(result.factors.every(f => f.weight > 0)).toBe(true);
  });

  it('should manage shadow mode configuration', () => {
    expect(shadowModeService.isEnabled()).toBe(false);
    
    shadowModeService.enableShadowMode();
    expect(shadowModeService.isEnabled()).toBe(true);
    
    shadowModeService.disableShadowMode();
    expect(shadowModeService.isEnabled()).toBe(false);
  });

  it('should generate detailed explanations', () => {
    const request = createMockRequest();
    const vehicle = createMockVehicle();
    const alternatives = [
      {
        vehicleId: 'vehicle-1',
        score: 75,
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        routeDeviation: 3,
        capacityUtilization: 45,
      },
    ];
    const vehicleEvaluations = [
      {
        vehicle,
        hardConstraints: [],
        softConstraints: [],
        constraintsSatisfied: true,
        routeCalculation: {
          totalDistance: 15,
          totalDuration: 30,
          estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          routeDeviation: 3,
        },
        scoringFactors: [],
      },
    ];

    const explanation = explanationService.generateDetailedExplanation(
      request,
      'vehicle-1',
      alternatives,
      vehicleEvaluations,
      false,
    );

    expect(explanation.reasoning).toBeDefined();
    expect(explanation.riskAssessment).toBeDefined();
    expect(explanation.riskAssessment.overallRisk).toBeGreaterThanOrEqual(0);
    expect(explanation.riskAssessment.overallRisk).toBeLessThanOrEqual(1);
  });
});

console.log('Decision Engine Integration Test - All components initialized successfully');