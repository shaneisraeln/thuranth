import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapacityService, ParcelDimensions } from './capacity.service';
import { VehicleEntity } from '../entities/vehicle.entity';
import { VehicleTrackingGateway } from '../gateways/vehicle-tracking.gateway';
import { VehicleType, VehicleCapacity } from '@pdcp/types';

describe('CapacityService', () => {
  let service: CapacityService;
  let repository: Repository<VehicleEntity>;
  let gateway: VehicleTrackingGateway;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockGateway = {
    broadcastCapacityUpdate: jest.fn(),
    broadcastNearFullAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityService,
        {
          provide: getRepositoryToken(VehicleEntity),
          useValue: mockRepository,
        },
        {
          provide: VehicleTrackingGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<CapacityService>(CapacityService);
    repository = module.get<Repository<VehicleEntity>>(getRepositoryToken(VehicleEntity));
    gateway = module.get<VehicleTrackingGateway>(VehicleTrackingGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignParcelToVehicle', () => {
    it('should assign parcel and update capacity', async () => {
      const vehicleId = 'vehicle-uuid';
      const parcelDimensions: ParcelDimensions = {
        weight: 10,
        volume: 50000,
      };

      const mockVehicle = {
        id: vehicleId,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 20,
          currentVolume: 100000,
          utilizationPercentage: 33.33,
        } as VehicleCapacity,
        lastUpdated: new Date(),
      };

      const expectedNewCapacity = {
        maxWeight: 100,
        maxVolume: 300000,
        currentWeight: 30,
        currentVolume: 150000,
        utilizationPercentage: 50, // Max of (30/100)*100 and (150000/300000)*100
      };

      mockRepository.findOne.mockResolvedValue(mockVehicle);
      mockRepository.save.mockResolvedValue({
        ...mockVehicle,
        capacity: expectedNewCapacity,
      });

      const result = await service.assignParcelToVehicle(vehicleId, parcelDimensions);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: vehicleId },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockGateway.broadcastCapacityUpdate).toHaveBeenCalled();
      expect(result.vehicleId).toBe(vehicleId);
      expect(result.newCapacity.currentWeight).toBe(30);
      expect(result.newCapacity.currentVolume).toBe(150000);
      expect(result.isNearFull).toBe(false);
    });

    it('should throw error if assignment exceeds weight capacity', async () => {
      const vehicleId = 'vehicle-uuid';
      const parcelDimensions: ParcelDimensions = {
        weight: 90, // Would exceed capacity
        volume: 50000,
      };

      const mockVehicle = {
        id: vehicleId,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 20,
          currentVolume: 100000,
          utilizationPercentage: 33.33,
        } as VehicleCapacity,
      };

      mockRepository.findOne.mockResolvedValue(mockVehicle);

      await expect(service.assignParcelToVehicle(vehicleId, parcelDimensions)).rejects.toThrow(
        'Assignment would exceed weight capacity'
      );
    });

    it('should trigger near-full alert when threshold is reached', async () => {
      const vehicleId = 'vehicle-uuid';
      const parcelDimensions: ParcelDimensions = {
        weight: 10,
        volume: 50000,
      };

      const mockVehicle = {
        id: vehicleId,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 80, // Will reach 90% after assignment
          currentVolume: 250000,
          utilizationPercentage: 83.33,
        } as VehicleCapacity,
        lastUpdated: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockVehicle);
      mockRepository.save.mockResolvedValue({
        ...mockVehicle,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 90,
          currentVolume: 300000,
          utilizationPercentage: 100,
        },
      });

      const result = await service.assignParcelToVehicle(vehicleId, parcelDimensions);

      expect(result.isNearFull).toBe(true);
      expect(mockGateway.broadcastNearFullAlert).toHaveBeenCalled();
    });
  });

  describe('removeParcelFromVehicle', () => {
    it('should remove parcel and update capacity', async () => {
      const vehicleId = 'vehicle-uuid';
      const parcelDimensions: ParcelDimensions = {
        weight: 10,
        volume: 50000,
      };

      const mockVehicle = {
        id: vehicleId,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 30,
          currentVolume: 150000,
          utilizationPercentage: 50,
        } as VehicleCapacity,
        lastUpdated: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockVehicle);
      mockRepository.save.mockResolvedValue({
        ...mockVehicle,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 20,
          currentVolume: 100000,
          utilizationPercentage: 33.33,
        },
      });

      const result = await service.removeParcelFromVehicle(vehicleId, parcelDimensions);

      expect(result.newCapacity.currentWeight).toBe(20);
      expect(result.newCapacity.currentVolume).toBe(100000);
      expect(result.utilizationChange).toBeLessThan(0);
    });

    it('should throw error if removal would result in negative capacity', async () => {
      const vehicleId = 'vehicle-uuid';
      const parcelDimensions: ParcelDimensions = {
        weight: 50, // More than current weight
        volume: 50000,
      };

      const mockVehicle = {
        id: vehicleId,
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 30,
          currentVolume: 150000,
          utilizationPercentage: 50,
        } as VehicleCapacity,
      };

      mockRepository.findOne.mockResolvedValue(mockVehicle);

      await expect(service.removeParcelFromVehicle(vehicleId, parcelDimensions)).rejects.toThrow(
        'Cannot remove parcel: would result in negative capacity'
      );
    });
  });

  describe('getNearFullVehicles', () => {
    it('should return vehicles with utilization >= 90%', async () => {
      const mockVehicles = [
        {
          id: 'vehicle-1',
          capacity: { utilizationPercentage: 95 } as VehicleCapacity,
        },
        {
          id: 'vehicle-2',
          capacity: { utilizationPercentage: 85 } as VehicleCapacity,
        },
        {
          id: 'vehicle-3',
          capacity: { utilizationPercentage: 92 } as VehicleCapacity,
        },
      ];

      mockRepository.find.mockResolvedValue(mockVehicles);

      const result = await service.getNearFullVehicles();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('vehicle-1');
      expect(result[1].id).toBe('vehicle-3');
    });
  });
});