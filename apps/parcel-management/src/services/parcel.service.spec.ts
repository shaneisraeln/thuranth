import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParcelService } from './parcel.service';
import { ParcelEntity } from '../entities/parcel.entity';
import { ParcelStatus, Priority } from '@pdcp/types';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ParcelService', () => {
  let service: ParcelService;
  let repository: Repository<ParcelEntity>;

  const mockRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParcelService,
        {
          provide: getRepositoryToken(ParcelEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ParcelService>(ParcelService);
    repository = module.get<Repository<ParcelEntity>>(getRepositoryToken(ParcelEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createParcel', () => {
    it('should create a new parcel successfully', async () => {
      const createParcelDto = {
        trackingNumber: 'TEST123',
        sender: {
          name: 'John Doe',
          phone: '+91-9876543210',
          email: 'john@example.com',
          address: {
            street: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India',
          },
        },
        recipient: {
          name: 'Jane Smith',
          phone: '+91-9876543211',
          address: {
            street: '456 Oak Ave',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'India',
          },
        },
        pickupLocation: { latitude: 19.0760, longitude: 72.8777 },
        deliveryLocation: { latitude: 28.6139, longitude: 77.2090 },
        slaDeadline: '2024-12-31T18:00:00Z',
        weight: 2.5,
        dimensions: { length: 30, width: 20, height: 15 },
        value: 1000,
        priority: Priority.MEDIUM,
      };

      const savedParcel = new ParcelEntity();
      savedParcel.id = 'test-id';
      savedParcel.trackingNumber = createParcelDto.trackingNumber;
      savedParcel.status = ParcelStatus.PENDING;

      mockRepository.findOne.mockResolvedValue(null); // No existing parcel
      mockRepository.save.mockResolvedValue(savedParcel);

      const result = await service.createParcel(createParcelDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { trackingNumber: createParcelDto.trackingNumber },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.trackingNumber).toBe(createParcelDto.trackingNumber);
      expect(result.status).toBe(ParcelStatus.PENDING);
    });

    it('should throw BadRequestException if tracking number already exists', async () => {
      const createParcelDto = {
        trackingNumber: 'EXISTING123',
        sender: {} as any,
        recipient: {} as any,
        pickupLocation: { latitude: 0, longitude: 0 },
        deliveryLocation: { latitude: 0, longitude: 0 },
        slaDeadline: '2024-12-31T18:00:00Z',
        weight: 1,
        dimensions: { length: 10, width: 10, height: 10 },
        value: 100,
        priority: Priority.LOW,
      };

      const existingParcel = new ParcelEntity();
      existingParcel.trackingNumber = createParcelDto.trackingNumber;

      mockRepository.findOne.mockResolvedValue(existingParcel);

      await expect(service.createParcel(createParcelDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findParcelById', () => {
    it('should return parcel when found', async () => {
      const parcelId = 'test-id';
      const parcel = new ParcelEntity();
      parcel.id = parcelId;
      parcel.trackingNumber = 'TEST123';

      mockRepository.findOne.mockResolvedValue(parcel);

      const result = await service.findParcelById(parcelId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: parcelId } });
      expect(result.id).toBe(parcelId);
    });

    it('should throw NotFoundException when parcel not found', async () => {
      const parcelId = 'non-existent-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findParcelById(parcelId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignParcelToVehicle', () => {
    it('should assign parcel to vehicle successfully', async () => {
      const parcelId = 'test-parcel-id';
      const vehicleId = 'test-vehicle-id';
      
      const parcel = new ParcelEntity();
      parcel.id = parcelId;
      parcel.status = ParcelStatus.PENDING;

      const assignedParcel = { ...parcel };
      assignedParcel.assignedVehicleId = vehicleId;
      assignedParcel.status = ParcelStatus.ASSIGNED;

      mockRepository.findOne.mockResolvedValue(parcel);
      mockRepository.save.mockResolvedValue(assignedParcel);

      const result = await service.assignParcelToVehicle(parcelId, vehicleId);

      expect(result.assignedVehicleId).toBe(vehicleId);
      expect(result.status).toBe(ParcelStatus.ASSIGNED);
    });

    it('should throw BadRequestException if parcel is not in PENDING status', async () => {
      const parcelId = 'test-parcel-id';
      const vehicleId = 'test-vehicle-id';
      
      const parcel = new ParcelEntity();
      parcel.id = parcelId;
      parcel.status = ParcelStatus.DELIVERED; // Not PENDING

      mockRepository.findOne.mockResolvedValue(parcel);

      await expect(service.assignParcelToVehicle(parcelId, vehicleId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingParcels', () => {
    it('should return pending parcels ordered by priority and SLA deadline', async () => {
      const pendingParcels = [
        { id: '1', status: ParcelStatus.PENDING, priority: Priority.HIGH },
        { id: '2', status: ParcelStatus.PENDING, priority: Priority.MEDIUM },
      ];

      mockRepository.find.mockResolvedValue(pendingParcels);

      const result = await service.getPendingParcels();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: ParcelStatus.PENDING },
        order: { priority: 'DESC', slaDeadline: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});