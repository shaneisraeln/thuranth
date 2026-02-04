import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShadowModeService } from './shadow-mode.service';
import { DecisionEntity } from '../entities/decision.entity';
import { DecisionRequest, DecisionResponse } from '@pdcp/types';

describe('ShadowModeService', () => {
  let service: ShadowModeService;
  let repository: jest.Mocked<Repository<DecisionEntity>>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShadowModeService,
        {
          provide: getRepositoryToken(DecisionEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ShadowModeService>(ShadowModeService);
    repository = module.get(getRepositoryToken(DecisionEntity));
  });

  const createMockRequest = (): DecisionRequest => ({
    parcelId: 'parcel-1',
    pickupLocation: { latitude: 12.9716, longitude: 77.5946 },
    deliveryLocation: { latitude: 12.9352, longitude: 77.6245 },
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
    weight: 5,
    dimensions: { length: 30, width: 20, height: 15 },
    priority: 'MEDIUM',
  });

  const createMockDecisionResponse = (overrides?: Partial<DecisionResponse>): DecisionResponse => ({
    requestId: 'req-1',
    parcelId: 'parcel-1',
    recommendedVehicleId: 'vehicle-1',
    score: 75.5,
    explanation: {
      hardConstraints: [],
      softConstraints: [],
      scoringFactors: [],
      riskAssessment: {
        slaRisk: 0.2,
        capacityRisk: 0.3,
        routeRisk: 0.1,
        overallRisk: 0.2,
        riskFactors: [],
      },
      reasoning: 'Test reasoning',
    },
    alternatives: [],
    requiresNewDispatch: false,
    shadowMode: true,
    timestamp: new Date(),
    ...overrides,
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { enabled: true, comparisonEnabled: true };
      service.updateConfig(newConfig);
      
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.comparisonEnabled).toBe(true);
    });

    it('should check if shadow mode is enabled', () => {
      expect(service.isEnabled()).toBe(false);
      
      service.enableShadowMode();
      expect(service.isEnabled()).toBe(true);
      
      service.disableShadowMode();
      expect(service.isEnabled()).toBe(false);
    });

    it('should enable shadow mode with comparison option', () => {
      service.enableShadowMode(true);
      
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.comparisonEnabled).toBe(true);
      expect(config.logAllDecisions).toBe(true);
    });
  });

  describe('logShadowDecision', () => {
    it('should log shadow decision when enabled', async () => {
      const mockEntity = { id: 'decision-1' };
      repository.create.mockReturnValue(mockEntity as any);
      repository.save.mockResolvedValue(mockEntity as any);

      service.enableShadowMode();
      const request = createMockRequest();
      const decision = createMockDecisionResponse();

      await service.logShadowDecision(request, decision);

      expect(repository.create).toHaveBeenCalledWith({
        parcelId: request.parcelId,
        requestTimestamp: decision.timestamp,
        recommendedVehicleId: decision.recommendedVehicleId,
        score: decision.score,
        explanation: decision.explanation,
        shadowMode: true,
        executed: false,
        overridden: false,
      });
      expect(repository.save).toHaveBeenCalledWith(mockEntity);
    });

    it('should not log when shadow mode is disabled and logAllDecisions is false', async () => {
      service.updateConfig({ enabled: false, logAllDecisions: false });
      
      const request = createMockRequest();
      const decision = createMockDecisionResponse();

      await service.logShadowDecision(request, decision);

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      repository.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      service.enableShadowMode();
      const request = createMockRequest();
      const decision = createMockDecisionResponse();

      // Should not throw
      await expect(service.logShadowDecision(request, decision)).resolves.toBeUndefined();
    });
  });

  describe('compareDecisions', () => {
    it('should compare shadow and production decisions', async () => {
      const request = createMockRequest();
      const shadowDecision = createMockDecisionResponse({ 
        score: 75.5, 
        recommendedVehicleId: 'vehicle-1' 
      });
      const productionDecision = createMockDecisionResponse({ 
        score: 80.0, 
        recommendedVehicleId: 'vehicle-2',
        shadowMode: false,
      });

      const comparison = await service.compareDecisions(request, shadowDecision, productionDecision);

      expect(comparison.scoreDifference).toBe(4.5);
      expect(comparison.vehicleDifference).toBe(true);
      expect(comparison.requiresReview).toBe(false); // Score diff < 10
      expect(comparison.shadowDecision).toBe(shadowDecision);
      expect(comparison.productionDecision).toBe(productionDecision);
    });

    it('should flag for review when score difference exceeds threshold', async () => {
      const request = createMockRequest();
      const shadowDecision = createMockDecisionResponse({ score: 60.0 });
      const productionDecision = createMockDecisionResponse({ 
        score: 85.0,
        shadowMode: false,
      });

      const comparison = await service.compareDecisions(request, shadowDecision, productionDecision);

      expect(comparison.scoreDifference).toBe(25.0);
      expect(comparison.requiresReview).toBe(true); // Score diff > 10
    });

    it('should flag for review when vehicles are different', async () => {
      const request = createMockRequest();
      const shadowDecision = createMockDecisionResponse({ 
        score: 75.0,
        recommendedVehicleId: 'vehicle-1',
      });
      const productionDecision = createMockDecisionResponse({ 
        score: 76.0,
        recommendedVehicleId: 'vehicle-2',
        shadowMode: false,
      });

      const comparison = await service.compareDecisions(request, shadowDecision, productionDecision);

      expect(comparison.scoreDifference).toBe(1.0);
      expect(comparison.vehicleDifference).toBe(true);
      expect(comparison.requiresReview).toBe(true); // Different vehicles
    });
  });

  describe('validateShadowDecisions', () => {
    it('should validate shadow decisions against production decisions', async () => {
      const baseTime = new Date();
      const shadowDecisions = [
        {
          parcelId: 'parcel-1',
          shadowMode: true,
          recommendedVehicleId: 'vehicle-1',
          score: 75,
          requestTimestamp: baseTime,
          createdAt: baseTime,
        },
        {
          parcelId: 'parcel-1',
          shadowMode: true,
          recommendedVehicleId: 'vehicle-2',
          score: 80,
          requestTimestamp: new Date(baseTime.getTime() + 60000),
          createdAt: new Date(baseTime.getTime() + 60000),
        },
      ];

      const productionDecisions = [
        {
          parcelId: 'parcel-1',
          shadowMode: false,
          recommendedVehicleId: 'vehicle-1',
          score: 77,
          requestTimestamp: new Date(baseTime.getTime() + 30000), // Within 5 minutes
          createdAt: new Date(baseTime.getTime() + 30000),
        },
        {
          parcelId: 'parcel-1',
          shadowMode: false,
          recommendedVehicleId: 'vehicle-3',
          score: 85,
          requestTimestamp: new Date(baseTime.getTime() + 90000), // Within 5 minutes
          createdAt: new Date(baseTime.getTime() + 90000),
        },
      ];

      repository.find
        .mockResolvedValueOnce(shadowDecisions as any)
        .mockResolvedValueOnce(productionDecisions as any);

      const validation = await service.validateShadowDecisions('parcel-1', 24);

      expect(validation.totalComparisons).toBe(2);
      expect(validation.accurateDecisions).toBe(1); // Only first one matches vehicle
      expect(validation.significantDifferences).toBe(0); // No score differences > 10
      expect(validation.averageScoreDifference).toBe(3.5); // (2 + 5) / 2
    });

    it('should handle no matching decisions', async () => {
      repository.find
        .mockResolvedValueOnce([]) // No shadow decisions
        .mockResolvedValueOnce([]); // No production decisions

      const validation = await service.validateShadowDecisions('parcel-1', 24);

      expect(validation.totalComparisons).toBe(0);
      expect(validation.accurateDecisions).toBe(0);
      expect(validation.significantDifferences).toBe(0);
      expect(validation.averageScoreDifference).toBe(0);
    });
  });

  describe('getShadowDecisionHistory', () => {
    it('should get shadow decision history', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getShadowDecisionHistory('parcel-1', 50);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('decision');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('decision.shadowMode = :shadowMode', { shadowMode: true });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('decision.parcelId = :parcelId', { parcelId: 'parcel-1' });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('decision.createdAt', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should get all shadow decisions when no parcelId provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getShadowDecisionHistory(undefined, 100);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('decision.shadowMode = :shadowMode', { shadowMode: true });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });
});