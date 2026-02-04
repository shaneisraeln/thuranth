import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLogEntity, AuditEventType } from '../entities/audit-log.entity';
import { AuditLogRequest, DecisionAuditData, OverrideAuditData } from '../interfaces/audit.interfaces';

describe('AuditLoggerService', () => {
  let service: AuditLoggerService;
  let repository: Repository<AuditLogEntity>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLoggerService,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLoggerService>(AuditLoggerService);
    repository = module.get<Repository<AuditLogEntity>>(getRepositoryToken(AuditLogEntity));

    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create audit log with cryptographic hash', async () => {
      const request: AuditLogRequest = {
        eventType: AuditEventType.DECISION_MADE,
        entityType: 'parcel',
        entityId: 'parcel-123',
        userId: 'user-456',
        eventData: { test: 'data' },
        serviceName: 'decision-engine',
      };

      const savedLog = new AuditLogEntity();
      savedLog.id = 'log-id';
      savedLog.eventType = request.eventType;
      savedLog.dataHash = 'mock-hash';

      mockRepository.create.mockReturnValue(savedLog);
      mockRepository.save.mockResolvedValue(savedLog);

      const result = await service.createAuditLog(request);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: request.eventType,
          entityType: request.entityType,
          entityId: request.entityId,
          userId: request.userId,
          eventData: request.eventData,
          serviceName: request.serviceName,
          dataHash: expect.any(String),
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('log-id');
    });
  });

  describe('logDecision', () => {
    it('should log decision with proper event data', async () => {
      const parcelId = 'parcel-123';
      const decisionData: DecisionAuditData = {
        parcelId,
        recommendedVehicleId: 'vehicle-456',
        score: 85.5,
        explanation: { test: 'explanation' },
        shadowMode: false,
        alternatives: [],
        requiresNewDispatch: false,
        processingTimeMs: 150,
      };

      const savedLog = new AuditLogEntity();
      savedLog.id = 'log-id';

      mockRepository.create.mockReturnValue(savedLog);
      mockRepository.save.mockResolvedValue(savedLog);

      await service.logDecision(parcelId, decisionData, 'user-123', 'correlation-456');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.DECISION_MADE,
          entityType: 'parcel',
          entityId: parcelId,
          userId: 'user-123',
          eventData: expect.objectContaining({
            ...decisionData,
            timestamp: expect.any(String),
          }),
          serviceName: 'decision-engine',
          correlationId: 'correlation-456',
        })
      );
    });
  });

  describe('logManualOverride', () => {
    it('should log manual override with justification', async () => {
      const overrideData: OverrideAuditData = {
        originalDecisionId: 'decision-123',
        originalRecommendation: 'vehicle-456',
        overrideAction: 'assign_to_different_vehicle',
        justification: 'Driver requested different route',
        approvalRequired: true,
        approvedBy: 'supervisor-789',
      };

      const savedLog = new AuditLogEntity();
      savedLog.id = 'log-id';

      mockRepository.create.mockReturnValue(savedLog);
      mockRepository.save.mockResolvedValue(savedLog);

      await service.logManualOverride(
        'parcel',
        'parcel-123',
        overrideData,
        'user-456',
        '192.168.1.1',
        'Mozilla/5.0',
        'session-789'
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.MANUAL_OVERRIDE,
          entityType: 'parcel',
          entityId: 'parcel-123',
          userId: 'user-456',
          eventData: expect.objectContaining({
            ...overrideData,
            timestamp: expect.any(String),
          }),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'session-789',
        })
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filtering', async () => {
      const mockLogs = [
        { id: 'log-1', eventType: AuditEventType.DECISION_MADE },
        { id: 'log-2', eventType: AuditEventType.MANUAL_OVERRIDE },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockLogs);

      const filter = {
        eventType: AuditEventType.DECISION_MADE,
        entityType: 'parcel',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10,
      };

      const result = await service.getAuditLogs(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.eventType = :eventType',
        { eventType: filter.eventType }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.entityType = :entityType',
        { entityType: filter.entityType }
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockLogs);
    });
  });

  describe('verifyLogIntegrity', () => {
    it('should verify log integrity correctly', async () => {
      const logId = 'log-123';
      const eventData = { test: 'data' };
      
      const log = new AuditLogEntity();
      log.id = logId;
      log.eventData = eventData;
      log.dataHash = service['generateDataHash'](eventData); // Access private method for testing

      mockRepository.findOne.mockResolvedValue(log);

      const result = await service.verifyLogIntegrity(logId);

      expect(result).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: logId } });
    });

    it('should detect compromised log integrity', async () => {
      const logId = 'log-123';
      const eventData = { test: 'data' };
      
      const log = new AuditLogEntity();
      log.id = logId;
      log.eventData = eventData;
      log.dataHash = 'wrong-hash'; // Incorrect hash

      mockRepository.findOne.mockResolvedValue(log);

      const result = await service.verifyLogIntegrity(logId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent log', async () => {
      const logId = 'non-existent';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyLogIntegrity(logId);

      expect(result).toBe(false);
    });
  });
});