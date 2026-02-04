import { Test, TestingModule } from '@nestjs/testing';
import { CryptographyService, DigitalSignatureData } from './cryptography.service';
import { CustodyRecord, CustodyTransfer } from '@pdcp/types';

describe('CryptographyService', () => {
  let service: CryptographyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptographyService],
    }).compile();

    service = module.get<CryptographyService>(CryptographyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDigitalSignature', () => {
    it('should generate a digital signature', () => {
      const data: DigitalSignatureData = {
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        timestamp: '2023-01-01T00:00:00.000Z',
        location: { latitude: 12.9716, longitude: 77.5946 },
        metadata: { test: 'data' },
      };

      const signature = service.generateDigitalSignature(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('verifyDigitalSignature', () => {
    it('should verify a valid digital signature', () => {
      const data: DigitalSignatureData = {
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        timestamp: '2023-01-01T00:00:00.000Z',
        location: { latitude: 12.9716, longitude: 77.5946 },
        metadata: { test: 'data' },
      };

      const signature = service.generateDigitalSignature(data);
      const isValid = service.verifyDigitalSignature(data, signature);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid digital signature', () => {
      const data: DigitalSignatureData = {
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        timestamp: '2023-01-01T00:00:00.000Z',
        location: { latitude: 12.9716, longitude: 77.5946 },
        metadata: { test: 'data' },
      };

      const invalidSignature = 'invalid-signature';
      const isValid = service.verifyDigitalSignature(data, invalidSignature);

      expect(isValid).toBe(false);
    });
  });

  describe('calculateRecordHash', () => {
    it('should calculate a consistent hash for a custody record', () => {
      const record: CustodyRecord = {
        id: 'test-record-id',
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        location: { latitude: 12.9716, longitude: 77.5946 },
        digitalSignature: 'test-signature',
        verified: true,
        metadata: { test: 'data' },
      };

      const hash1 = service.calculateRecordHash(record);
      const hash2 = service.calculateRecordHash(record);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });
  });

  describe('calculateChainHash', () => {
    it('should calculate a consistent hash for a custody chain', () => {
      const records: CustodyRecord[] = [
        {
          id: 'record-1',
          parcelId: 'test-parcel-1',
          fromParty: 'sender',
          toParty: 'driver',
          timestamp: new Date('2023-01-01T00:00:00.000Z'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: 'signature-1',
          verified: true,
        },
        {
          id: 'record-2',
          parcelId: 'test-parcel-1',
          fromParty: 'driver',
          toParty: 'recipient',
          timestamp: new Date('2023-01-02T00:00:00.000Z'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: 'signature-2',
          verified: true,
        },
      ];

      const hash1 = service.calculateChainHash(records);
      const hash2 = service.calculateChainHash(records);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    it('should return consistent hash for empty chain', () => {
      const hash = service.calculateChainHash([]);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });
  });

  describe('verifyChainIntegrity', () => {
    it('should verify a valid custody chain', () => {
      const records: CustodyRecord[] = [
        {
          id: 'record-1',
          parcelId: 'test-parcel-1',
          fromParty: 'sender',
          toParty: 'driver',
          timestamp: new Date('2023-01-01T00:00:00.000Z'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: service.generateDigitalSignature({
            parcelId: 'test-parcel-1',
            fromParty: 'sender',
            toParty: 'driver',
            timestamp: '2023-01-01T00:00:00.000Z',
            location: { latitude: 12.9716, longitude: 77.5946 },
          }),
          verified: true,
        },
        {
          id: 'record-2',
          parcelId: 'test-parcel-1',
          fromParty: 'driver',
          toParty: 'recipient',
          timestamp: new Date('2023-01-02T00:00:00.000Z'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: service.generateDigitalSignature({
            parcelId: 'test-parcel-1',
            fromParty: 'driver',
            toParty: 'recipient',
            timestamp: '2023-01-02T00:00:00.000Z',
            location: { latitude: 12.9716, longitude: 77.5946 },
          }),
          verified: true,
        },
      ];

      const result = service.verifyChainIntegrity(records);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect chain break in custody continuity', () => {
      const records: CustodyRecord[] = [
        {
          id: 'record-1',
          parcelId: 'test-parcel-1',
          fromParty: 'sender',
          toParty: 'driver',
          timestamp: new Date('2023-01-01T00:00:00.000Z'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: 'signature-1',
          verified: true,
        },
        {
          id: 'record-2',
          parcelId: 'test-parcel-1',
          fromParty: 'different-party', // Chain break here
          toParty: 'recipient',
          timestamp: new Date('2023-01-02T00:00:00.000Z'),
          location: { latitude: 12.9716, longitude: 77.5946 },
          digitalSignature: 'signature-2',
          verified: true,
        },
      ];

      const result = service.verifyChainIntegrity(records);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('Custody chain break'))).toBe(true);
    });

    it('should return valid for empty chain', () => {
      const result = service.verifyChainIntegrity([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('generateRecordId', () => {
    it('should generate a unique record ID', () => {
      const transfer: CustodyTransfer = {
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        location: { latitude: 12.9716, longitude: 77.5946 },
        signature: 'test-signature',
      };

      const timestamp = new Date();
      const recordId = service.generateRecordId(transfer, timestamp);

      expect(recordId).toBeDefined();
      expect(typeof recordId).toBe('string');
      expect(recordId.length).toBe(64); // SHA-256 hex string length
    });

    it('should generate different IDs for different transfers', () => {
      const transfer1: CustodyTransfer = {
        parcelId: 'test-parcel-1',
        fromParty: 'sender',
        toParty: 'driver',
        location: { latitude: 12.9716, longitude: 77.5946 },
        signature: 'test-signature',
      };

      const transfer2: CustodyTransfer = {
        parcelId: 'test-parcel-2',
        fromParty: 'sender',
        toParty: 'driver',
        location: { latitude: 12.9716, longitude: 77.5946 },
        signature: 'test-signature',
      };

      const timestamp = new Date();
      const recordId1 = service.generateRecordId(transfer1, timestamp);
      const recordId2 = service.generateRecordId(transfer2, timestamp);

      expect(recordId1).not.toBe(recordId2);
    });
  });
});