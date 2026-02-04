import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleService } from './vehicle.service';
import { VehicleEntity } from '../entities/vehicle.entity';
import { VehicleTrackingGateway } from '../gateways/vehicle-tracking.gateway';
import { CreateVehicleDto } from '@pdcp/shared';
import { VehicleType, VehicleStatus } from '@pdcp/types';

describe('VehicleService', () => {
  let service: VehicleService;
  let repository: Repository<VehicleEntity>;
  let gateway: VehicleTrackingGateway;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockGateway = {
    broadcastVehicleStatusUpdate: jest.fn(),
    broadcastVehicleLocationUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
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

    service = module.get<VehicleService>(VehicleService);
    repository = module.get<Repository<VehicleEntity>>(getRepositoryToken(VehicleEntity));
    gateway = module.get<VehicleTrackingGateway>(VehicleTrackingGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVehicle', () => {
    it('should create a new vehicle successfully', async () => {
      const createVehicleDto: CreateVehicleDto = {
        registrationNumber: 'KA01AB1234',
        type: '2W' as VehicleType,
        driverId: 'driver-uuid',
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 0,
          currentVolume: 0,
          utilizationPercentage: 0,
        },
        currentLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      };

      const mockVehicleEntity = {
        id: 'vehicle-uuid',
        ...createVehicleDto,
        capacity: {
          ...createVehicleDto.capacity,
          currentWeight: 0,
          currentVolume: 0,
          utilizationPercentage: 0,
        },
        currentRoute: [],
        status: 'AVAILABLE' as VehicleStatus,
        eligibilityScore: 100,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing vehicle
      mockRepository.create.mockReturnValue(mockVehicleEntity);
      mockRepository.save.mockResolvedValue(mockVehicleEntity);

      const result = await service.createVehicle(createVehicleDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { registrationNumber: createVehicleDto.registrationNumber },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockGateway.broadcastVehicleStatusUpdate).toHaveBeenCalled();
      expect(result.id).toBe('vehicle-uuid');
      expect(result.registrationNumber).toBe('KA01AB1234');
    });

    it('should throw error if registration number already exists', async () => {
      const createVehicleDto: CreateVehicleDto = {
        registrationNumber: 'KA01AB1234',
        type: '2W' as VehicleType,
        driverId: 'driver-uuid',
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 0,
          currentVolume: 0,
          utilizationPercentage: 0,
        },
        currentLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      };

      mockRepository.findOne.mockResolvedValue({ id: 'existing-vehicle' });

      await expect(service.createVehicle(createVehicleDto)).rejects.toThrow(
        'Vehicle with this registration number already exists'
      );
    });

    it('should validate capacity limits for 2W vehicles', async () => {
      const createVehicleDto: CreateVehicleDto = {
        registrationNumber: 'KA01AB1234',
        type: '2W' as VehicleType,
        driverId: 'driver-uuid',
        capacity: {
          maxWeight: 200, // Exceeds 2W limit of 150kg
          maxVolume: 300000,
          currentWeight: 0,
          currentVolume: 0,
          utilizationPercentage: 0,
        },
        currentLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.createVehicle(createVehicleDto)).rejects.toThrow(
        'Maximum weight for 2W vehicle cannot exceed 150kg'
      );
    });
  });

  describe('updateVehicleLocation', () => {
    it('should update vehicle location and broadcast update', async () => {
      const vehicleId = 'vehicle-uuid';
      const updateLocationDto = {
        vehicleId,
        location: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
        speed: 30,
        heading: 90,
      };

      const mockVehicle = {
        id: vehicleId,
        registrationNumber: 'KA01AB1234',
        type: '2W' as VehicleType,
        driverId: 'driver-uuid',
        capacity: {
          maxWeight: 100,
          maxVolume: 300000,
          currentWeight: 0,
          currentVolume: 0,
          utilizationPercentage: 0,
        },
        currentLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
        currentRoute: [],
        status: 'AVAILABLE' as VehicleStatus,
        eligibilityScore: 100,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockVehicle);
      mockRepository.save.mockResolvedValue({
        ...mockVehicle,
        currentLocation: updateLocationDto.location,
        lastUpdated: new Date(),
      });

      const result = await service.updateVehicleLocation(updateLocationDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: vehicleId },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockGateway.broadcastVehicleLocationUpdate).toHaveBeenCalled();
      expect(result.currentLocation).toEqual(updateLocationDto.location);
    });

    it('should validate GPS coordinates', async () => {
      const updateLocationDto = {
        vehicleId: 'vehicle-uuid',
        location: {
          latitude: 95, // Invalid latitude
          longitude: 77.5946,
        },
      };

      const mockVehicle = { id: 'vehicle-uuid' };
      mockRepository.findOne.mockResolvedValue(mockVehicle);

      await expect(service.updateVehicleLocation(updateLocationDto)).rejects.toThrow(
        'Invalid latitude: must be between -90 and 90'
      );
    });
  });
});