import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CustodyService } from './custody.service';
import { CryptographyService } from './cryptography.service';
import { BlockchainClientFactory } from '../blockchain/blockchain-client.factory';
import { CustodyRecordEntity } from '../entities/custody-record.entity';
import { CustodyQueueEntity } from '../entities/custody-queue.entity';
import { CustodyTransfer } from '@pdcp/types';

describe('CustodyService', () => {
  let service: CustodyService;
  let custodyRecordRepository: Repository<CustodyRecordEntity>;
  let custodyQueueRepository: Repository<CustodyQueueEntity>;
  let cryptographyService: CryptographyService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockBlockchainClientFactory = {
    createClient: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        BLOCKCHAIN_TYPE: 'hyperledger-fabric',
        BLOCKCHAIN_CONNECTION_STRING: 'localhost:7051',
        BLOCKCHAIN_CHAINCODE_NAME: 'custody',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustodyService,
        CryptographyService,
        {
          provide: getRepositoryToken(CustodyRecordEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(CustodyQueueEntity),
          useValue: mockRepository,
        },
        {
          provide: BlockchainClientFactory,
          useValue: mockBlockchainClientFactory,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CustodyService>(CustodyService);
    custodyRecordRepository = module.get<Repository<CustodyRecordEntity>>(
      getRepositoryToken(CustodyRecordEntity),
    );
    custodyQueueRepository = module.get<Repository<CustodyQueueEntity>>(
      getRepositoryToken(CustodyQueueEntity),
    );
    cryptographyService = module.get<CryptographyService>(CryptographyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordCustodyTransfer', () => {
    it('should create a custody record when blockchain is unavailable', async () => {
      const transfer: CustodyTransfer = {
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        location: { latitude: 12.9716, longitude: 77.5946 },
        signature: 'test-signature',
        metadata: { test: 'data' },
      };

      const mockRecord = {
        id: 'test-record-id',
        ...transfer,
        timestamp: new Date(),
        digitalSignature: transfer.signature,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockRecord);
      mockRepository.save.mockResolvedValue(mockRecord);

      const result = await service.recordCustodyTransfer(transfer);

      expect(result).toBeDefined();
      expect(result.parcelId).toBe(transfer.parcelId);
      expect(result.fromParty).toBe(transfer.fromParty);
      expect(result.toParty).toBe(transfer.toParty);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getCustodyChain', () => {
    it('should return custody chain for a parcel', async () => {
      const parcelId = 'test-parcel-1';
      const mockRecords = [
        {
          id: 'record-1',
          parcelId,
          fromParty: 'sender',
          toParty: 'driver',
          timestamp: new Date('2023-01-01'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: 'signature-1',
          verified: true,
        },
        {
          id: 'record-2',
          parcelId,
          fromParty: 'driver',
          toParty: 'recipient',
          timestamp: new Date('2023-01-02'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: 'signature-2',
          verified: true,
        },
      ];

      mockRepository.find.mockResolvedValue(mockRecords);

      const result = await service.getCustodyChain(parcelId);

      expect(result).toBeDefined();
      expect(result.parcelId).toBe(parcelId);
      expect(result.custodyRecords).toHaveLength(2);
      expect(result.verified).toBe(true);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { parcelId },
        order: { timestamp: 'ASC' },
      });
    });
  });

  describe('verifyCustodyRecord', () => {
    it('should verify a custody record', async () => {
      const recordId = 'test-record-id';
      const mockRecord = {
        id: recordId,
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        timestamp: new Date(),
        location: { latitude: 12.9716, longitude: 77.5946 },
        digitalSignature: 'test-signature',
        verified: true,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);

      const result = await service.verifyCustodyRecord(recordId);

      expect(typeof result).toBe('boolean');
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: recordId },
      });
    });

    it('should return false for non-existent record', async () => {
      const recordId = 'non-existent-record';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyCustodyRecord(recordId);

      expect(result).toBe(false);
    });
  });
});