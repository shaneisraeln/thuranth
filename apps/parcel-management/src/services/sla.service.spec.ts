import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SLAService } from './sla.service';
import { ParcelEntity } from '../entities/parcel.entity';
import { ParcelStatus, Priority } from '@pdcp/types';

describe('SLAService', () => {
  let service: SLAService;
  let repository: Repository<ParcelEntity>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SLAService,
        {
          provide: getRepositoryToken(ParcelEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SLAService>(SLAService);
    repository = module.get<Repository<ParcelEntity>>(getRepositoryToken(ParcelEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSLADeadline', () => {
    it('should calculate STANDARD service deadline correctly', () => {
      const pickupTime = new Date('2024-01-15T10:00:00Z');
      const deadline = service.calculateSLADeadline(pickupTime, 'STANDARD');
      
      expect(deadline.getDate()).toBe(16); // Next day
      expect(deadline.getHours()).toBe(18); // 6 PM
    });

    it('should calculate EXPRESS service deadline correctly', () => {
      const pickupTime = new Date('2024-01-15T10:00:00Z');
      const deadline = service.calculateSLADeadline(pickupTime, 'EXPRESS');
      
      expect(deadline.getHours()).toBe(14); // 4 hours later
    });

    it('should calculate SAME_DAY service deadline correctly', () => {
      const pickupTime = new Date('2024-01-15T10:00:00Z');
      const deadline = service.calculateSLADeadline(pickupTime, 'SAME_DAY');
      
      expect(deadline.getDate()).toBe(15); // Same day
      expect(deadline.getHours()).toBe(23); // End of day
    });
  });

  describe('validateSLA', () => {
    it('should validate SLA successfully for low-risk parcel', async () => {
      const parcelId = 'test-parcel-id';
      const currentLocation = { latitude: 19.0760, longitude: 72.8777 };
      const estimatedRouteDistance = 10; // km

      const parcel = new ParcelEntity();
      parcel.id = parcelId;
      parcel.slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
      parcel.pickupLocation = { latitude: 19.0760, longitude: 72.8777 };
      parcel.deliveryLocation = { latitude: 19.1000, longitude: 72.9000 };
      parcel.priority = Priority.MEDIUM;

      mockRepository.findOne.mockResolvedValue(parcel);

      const result = await service.validateSLA(parcelId, currentLocation, estimatedRouteDistance);

      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('LOW');
      expect(result.timeToDeadline).toBeGreaterThan(0);
    });

    it('should detect high-risk parcel with tight deadline', async () => {
      const parcelId = 'test-parcel-id';
      const currentLocation = { latitude: 19.0760, longitude: 72.8777 };
      const estimatedRouteDistance = 50; // Long distance

      const parcel = new ParcelEntity();
      parcel.id = parcelId;
      parcel.slaDeadline = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      parcel.pickupLocation = { latitude: 19.0760, longitude: 72.8777 };
      parcel.deliveryLocation = { latitude: 28.6139, longitude: 77.2090 }; // Delhi - far away
      parcel.priority = Priority.URGENT;

      mockRepository.findOne.mockResolvedValue(parcel);

      const result = await service.validateSLA(parcelId, currentLocation, estimatedRouteDistance);

      expect(result.riskLevel).toBeOneOf(['HIGH', 'CRITICAL']);
      expect(result.riskFactors).toContain('High priority parcel requires extra attention');
    });
  });

  describe('calculateDeliveryTimeImpact', () => {
    it('should calculate minimal impact for nearby locations', () => {
      const originalRoute = [
        { latitude: 19.0760, longitude: 72.8777 },
        { latitude: 19.0800, longitude: 72.8800 },
      ];
      const newPickupLocation = { latitude: 19.0770, longitude: 72.8780 };
      const newDeliveryLocation = { latitude: 19.0790, longitude: 72.8790 };
      const originalETA = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const result = service.calculateDeliveryTimeImpact(
        originalRoute,
        newPickupLocation,
        newDeliveryLocation,
        originalETA
      );

      expect(result.impactLevel).toBe('MINIMAL');
      expect(result.additionalTime).toBeLessThan(30); // Less than 30 minutes
      expect(result.newETA.getTime()).toBeGreaterThan(originalETA.getTime());
    });

    it('should calculate significant impact for distant locations', () => {
      const originalRoute = [
        { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
      ];
      const newPickupLocation = { latitude: 28.6139, longitude: 77.2090 }; // Delhi
      const newDeliveryLocation = { latitude: 12.9716, longitude: 77.5946 }; // Bangalore
      const originalETA = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const result = service.calculateDeliveryTimeImpact(
        originalRoute,
        newPickupLocation,
        newDeliveryLocation,
        originalETA
      );

      expect(result.impactLevel).toBeOneOf(['SIGNIFICANT', 'SEVERE']);
      expect(result.routeDeviation).toBeGreaterThan(100); // More than 100km deviation
    });
  });

  describe('getAtRiskParcels', () => {
    it('should return parcels at risk of SLA violation', async () => {
      const riskThreshold = 120; // 2 hours
      const atRiskParcels = [
        {
          id: 'parcel-1',
          trackingNumber: 'RISK001',
          status: ParcelStatus.ASSIGNED,
          slaDeadline: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
          assignedAt: new Date(Date.now() - 30 * 60 * 1000), // Assigned 30 minutes ago
          priority: Priority.HIGH,
        },
        {
          id: 'parcel-2',
          trackingNumber: 'RISK002',
          status: ParcelStatus.ASSIGNED,
          slaDeadline: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
          assignedAt: new Date(Date.now() - 60 * 60 * 1000), // Assigned 1 hour ago
          priority: Priority.URGENT,
        },
      ];

      mockRepository.find.mockResolvedValue(atRiskParcels);

      const result = await service.getAtRiskParcels(riskThreshold);

      expect(result).toHaveLength(2);
      expect(result[0].riskLevel).toBeOneOf(['MEDIUM', 'HIGH', 'CRITICAL']);
      expect(result[0].recommendedActions).toContain('Track progress regularly');
    });
  });

  describe('generateSLAComplianceReport', () => {
    it('should generate compliance report with correct metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const deliveredParcels = [
        {
          id: '1',
          status: ParcelStatus.DELIVERED,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T16:00:00Z'), // Delivered on time
          slaDeadline: new Date('2024-01-15T18:00:00Z'),
        },
        {
          id: '2',
          status: ParcelStatus.DELIVERED,
          createdAt: new Date('2024-01-20T10:00:00Z'),
          updatedAt: new Date('2024-01-20T20:00:00Z'), // Delivered late
          slaDeadline: new Date('2024-01-20T18:00:00Z'),
        },
      ];

      mockRepository.find.mockResolvedValue(deliveredParcels);

      const result = await service.generateSLAComplianceReport(startDate, endDate);

      expect(result.totalParcels).toBe(2);
      expect(result.onTimeDeliveries).toBe(1);
      expect(result.lateDeliveries).toBe(1);
      expect(result.complianceRate).toBe(50);
      expect(result.averageDeliveryTime).toBeGreaterThan(0);
    });
  });
});