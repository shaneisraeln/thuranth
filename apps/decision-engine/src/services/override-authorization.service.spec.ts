import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { OverrideAuthorizationService } from './override-authorization.service';
import { OverrideEntity } from '../entities/override.entity';
import { 
  OverrideRequest, 
  OverrideRiskLevel, 
  OverrideStatus,
  ApprovalStatus 
} from '../interfaces/override.interfaces';

// Feature: post-dispatch-consolidation-platform, Property 22: Override Authorization Requirements
describe('OverrideAuthorizationService - Property Tests', () => {
  let service: OverrideAuthorizationService;
  let repository: jest.Mocked<Repository<OverrideEntity>>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      }))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverrideAuthorizationService,
        {
          provide: getRepositoryToken(OverrideEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OverrideAuthorizationService>(OverrideAuthorizationService);
    repository = module.get(getRepositoryToken(OverrideEntity));
  });

  // Property 22: Override Authorization Requirements
  // For any manual override that bypasses SLA safety, the system should require additional authorization levels
  describe('Property 22: Override Authorization Requirements', () => {
    const overrideRequestArb = fc.record({
      decisionId: fc.uuid(),
      parcelId: fc.uuid(),
      requestedVehicleId: fc.option(fc.uuid(), { nil: undefined }),
      reason: fc.string({ minLength: 10, maxLength: 100 }),
      justification: fc.string({ minLength: 20, maxLength: 500 }),
      requestedBy: fc.uuid(),
      bypassesSLA: fc.boolean(),
      riskLevel: fc.constantFrom(
        OverrideRiskLevel.LOW,
        OverrideRiskLevel.MEDIUM,
        OverrideRiskLevel.HIGH,
        OverrideRiskLevel.CRITICAL
      )
    });

    it('should require additional authorization levels for SLA bypasses', async () => {
      await fc.assert(fc.asyncProperty(
        overrideRequestArb,
        async (overrideRequest: OverrideRequest) => {
          // Mock repository responses
          const mockOverrideEntity = {
            id: 'mock-override-id',
            ...overrideRequest,
            status: OverrideStatus.PENDING,
            approvalChain: [],
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
            isExpired: false,
            isPending: true,
            canBeExecuted: false
          };

          repository.create.mockReturnValue(mockOverrideEntity as any);
          repository.save.mockResolvedValue(mockOverrideEntity as any);

          // Execute the authorization initiation
          const response = await service.initiateOverrideAuthorization(overrideRequest);

          // Verify that SLA bypasses require additional authorization
          if (overrideRequest.bypassesSLA) {
            // SLA bypasses should require at least medium risk level authorization
            const approvalChain = response.approvalChain;
            
            if (overrideRequest.riskLevel === OverrideRiskLevel.LOW) {
              // Even low risk should be elevated when bypassing SLA
              expect(approvalChain.length).toBeGreaterThanOrEqual(2);
            } else if (overrideRequest.riskLevel === OverrideRiskLevel.MEDIUM) {
              // Medium risk with SLA bypass should require admin approval
              expect(approvalChain.length).toBeGreaterThanOrEqual(2);
              expect(approvalChain.some(step => step.approverRole === 'admin')).toBe(true);
            } else if (overrideRequest.riskLevel === OverrideRiskLevel.HIGH) {
              // High risk with SLA bypass should require multiple admin approvals
              expect(approvalChain.length).toBeGreaterThanOrEqual(2);
              const adminApprovals = approvalChain.filter(step => step.approverRole === 'admin').length;
              expect(adminApprovals).toBeGreaterThanOrEqual(2);
            } else if (overrideRequest.riskLevel === OverrideRiskLevel.CRITICAL) {
              // Critical risk with SLA bypass should require maximum authorization
              expect(approvalChain.length).toBeGreaterThanOrEqual(3);
              const adminApprovals = approvalChain.filter(step => step.approverRole === 'admin').length;
              expect(adminApprovals).toBeGreaterThanOrEqual(3);
            }
          }

          // Verify that all approval steps are properly initialized
          response.approvalChain.forEach(step => {
            expect(step.id).toBeDefined();
            expect(step.approverRole).toBeDefined();
            expect(step.status).toBe(ApprovalStatus.PENDING);
            expect(step.required).toBe(true);
          });

          // Verify response structure
          expect(response.overrideId).toBeDefined();
          expect(response.status).toBe(OverrideStatus.PENDING);
          expect(response.approvalChain).toBeDefined();
          expect(response.message).toBeDefined();
        }
      ), { numRuns: 10 });
    });

    it('should enforce stricter authorization for higher risk levels', async () => {
      await fc.assert(fc.asyncProperty(
        overrideRequestArb,
        async (overrideRequest: OverrideRequest) => {
          const mockOverrideEntity = {
            id: 'mock-override-id',
            ...overrideRequest,
            status: OverrideStatus.PENDING,
            approvalChain: [],
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            isExpired: false,
            isPending: true,
            canBeExecuted: false
          };

          repository.create.mockReturnValue(mockOverrideEntity as any);
          repository.save.mockResolvedValue(mockOverrideEntity as any);

          const response = await service.initiateOverrideAuthorization(overrideRequest);
          const approvalChain = response.approvalChain;

          // Verify authorization requirements scale with risk level
          switch (overrideRequest.riskLevel) {
            case OverrideRiskLevel.LOW:
              expect(approvalChain.length).toBeGreaterThanOrEqual(1);
              break;
            case OverrideRiskLevel.MEDIUM:
              expect(approvalChain.length).toBeGreaterThanOrEqual(2);
              break;
            case OverrideRiskLevel.HIGH:
              expect(approvalChain.length).toBeGreaterThanOrEqual(2);
              const highRiskAdminApprovals = approvalChain.filter(step => step.approverRole === 'admin').length;
              expect(highRiskAdminApprovals).toBeGreaterThanOrEqual(2);
              break;
            case OverrideRiskLevel.CRITICAL:
              expect(approvalChain.length).toBeGreaterThanOrEqual(3);
              const criticalRiskAdminApprovals = approvalChain.filter(step => step.approverRole === 'admin').length;
              expect(criticalRiskAdminApprovals).toBeGreaterThanOrEqual(3);
              break;
          }
        }
      ), { numRuns: 10 });
    });

    it('should properly handle approval workflow progression', async () => {
      await fc.assert(fc.asyncProperty(
        fc.tuple(overrideRequestArb, fc.uuid(), fc.boolean(), fc.option(fc.string(), { nil: undefined })),
        async ([overrideRequest, approverId, approved, comments]) => {
          const overrideId = 'test-override-id';
          
          // Create mock override with approval chain
          const mockOverride = {
            id: overrideId,
            ...overrideRequest,
            status: OverrideStatus.PENDING,
            approvalChain: [
              {
                id: 'step_1',
                approverRole: 'dispatcher',
                status: ApprovalStatus.PENDING,
                required: true
              },
              {
                id: 'step_2',
                approverRole: 'admin',
                status: ApprovalStatus.PENDING,
                required: true
              }
            ],
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            isExpired: false,
            isPending: true,
            canBeExecuted: false
          };

          repository.findOne.mockResolvedValue(mockOverride as any);
          repository.update.mockResolvedValue({ affected: 1 } as any);

          const response = await service.processApproval(overrideId, approverId, approved, comments);

          // Verify approval processing logic
          if (!approved) {
            // Rejection should immediately set status to rejected
            expect(response.status).toBe(OverrideStatus.REJECTED);
          } else {
            // Approval should progress the workflow
            const updatedChain = response.approvalChain;
            const approvedSteps = updatedChain.filter(step => step.status === ApprovalStatus.APPROVED);
            
            // At least one step should be approved
            expect(approvedSteps.length).toBeGreaterThanOrEqual(1);
            
            // If all required steps are approved, status should be approved
            const allRequiredApproved = updatedChain
              .filter(step => step.required)
              .every(step => step.status === ApprovalStatus.APPROVED);
            
            if (allRequiredApproved) {
              expect(response.status).toBe(OverrideStatus.APPROVED);
            } else {
              expect(response.status).toBe(OverrideStatus.PENDING);
            }
          }

          // Verify response structure
          expect(response.overrideId).toBe(overrideId);
          expect(response.approvalChain).toBeDefined();
          expect(response.message).toBeDefined();
        }
      ), { numRuns: 5 });
    });
  });

  // Unit tests for specific scenarios
  describe('Unit Tests', () => {
    it('should create approval chain for low risk override', async () => {
      const overrideRequest: OverrideRequest = {
        decisionId: 'decision-123',
        parcelId: 'parcel-123',
        reason: 'Urgent delivery required',
        justification: 'Customer has critical medical supplies that need immediate delivery',
        requestedBy: 'user-123',
        bypassesSLA: false,
        riskLevel: OverrideRiskLevel.LOW
      };

      const mockOverrideEntity = {
        id: 'override-123',
        ...overrideRequest,
        status: OverrideStatus.PENDING,
        approvalChain: [
          {
            id: 'step_1',
            approverRole: 'dispatcher',
            status: ApprovalStatus.PENDING,
            required: true
          }
        ],
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };

      repository.create.mockReturnValue(mockOverrideEntity as any);
      repository.save.mockResolvedValue(mockOverrideEntity as any);

      const response = await service.initiateOverrideAuthorization(overrideRequest);

      expect(response.status).toBe(OverrideStatus.PENDING);
      expect(response.approvalChain).toHaveLength(1);
      expect(response.approvalChain[0].approverRole).toBe('dispatcher');
    });

    it('should create approval chain for critical risk override with SLA bypass', async () => {
      const overrideRequest: OverrideRequest = {
        decisionId: 'decision-123',
        parcelId: 'parcel-123',
        reason: 'Emergency override required',
        justification: 'System failure requires manual intervention to prevent service disruption',
        requestedBy: 'user-123',
        bypassesSLA: true,
        riskLevel: OverrideRiskLevel.CRITICAL
      };

      const mockOverrideEntity = {
        id: 'override-123',
        ...overrideRequest,
        status: OverrideStatus.PENDING,
        approvalChain: [
          {
            id: 'step_1',
            approverRole: 'admin',
            status: ApprovalStatus.PENDING,
            required: true
          },
          {
            id: 'step_2',
            approverRole: 'admin',
            status: ApprovalStatus.PENDING,
            required: true
          },
          {
            id: 'step_3',
            approverRole: 'admin',
            status: ApprovalStatus.PENDING,
            required: true
          }
        ],
        expiresAt: new Date(Date.now() + 240 * 60 * 1000)
      };

      repository.create.mockReturnValue(mockOverrideEntity as any);
      repository.save.mockResolvedValue(mockOverrideEntity as any);

      const response = await service.initiateOverrideAuthorization(overrideRequest);

      expect(response.status).toBe(OverrideStatus.PENDING);
      expect(response.approvalChain).toHaveLength(3);
      expect(response.approvalChain.every(step => step.approverRole === 'admin')).toBe(true);
    });
  });
});