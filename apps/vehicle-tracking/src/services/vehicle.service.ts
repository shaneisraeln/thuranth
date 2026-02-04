import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleEntity } from '../entities/vehicle.entity';
import { CreateVehicleDto, UpdateVehicleLocationDto } from '@pdcp/shared';
import { Vehicle, VehicleLocationUpdate, VehicleType, VehicleStatus } from '@pdcp/types';
import { VehicleTrackingGateway } from '../gateways/vehicle-tracking.gateway';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    private readonly vehicleTrackingGateway: VehicleTrackingGateway,
  ) {}

  async createVehicle(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    // Check if registration number already exists
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { registrationNumber: createVehicleDto.registrationNumber },
    });

    if (existingVehicle) {
      throw new BadRequestException('Vehicle with this registration number already exists');
    }

    // Set default capacity values based on vehicle type
    const capacity = {
      ...createVehicleDto.capacity,
      currentWeight: 0,
      currentVolume: 0,
      utilizationPercentage: 0,
    };

    // Validate capacity limits based on vehicle type
    this.validateCapacityLimits(createVehicleDto.type, capacity);

    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      capacity,
      currentRoute: [],
      status: 'AVAILABLE' as VehicleStatus,
      eligibilityScore: 100, // Default high eligibility
      lastUpdated: new Date(),
    });

    const savedVehicle = await this.vehicleRepository.save(vehicle);
    const vehicleData = this.mapEntityToVehicle(savedVehicle);

    // Broadcast vehicle creation to connected clients
    this.vehicleTrackingGateway.broadcastVehicleStatusUpdate(vehicleData);

    return vehicleData;
  }

  async findAllVehicles(): Promise<Vehicle[]> {
    const vehicles = await this.vehicleRepository.find({
      order: { createdAt: 'DESC' },
    });
    return vehicles.map(vehicle => this.mapEntityToVehicle(vehicle));
  }

  async findVehicleById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return this.mapEntityToVehicle(vehicle);
  }

  async findAvailableVehicles(): Promise<Vehicle[]> {
    const vehicles = await this.vehicleRepository.find({
      where: { status: 'AVAILABLE' },
      order: { eligibilityScore: 'DESC' },
    });
    return vehicles.map(vehicle => this.mapEntityToVehicle(vehicle));
  }

  async findVehiclesByType(type: VehicleType): Promise<Vehicle[]> {
    const vehicles = await this.vehicleRepository.find({
      where: { type },
      order: { eligibilityScore: 'DESC' },
    });
    return vehicles.map(vehicle => this.mapEntityToVehicle(vehicle));
  }

  async updateVehicleLocation(updateLocationDto: UpdateVehicleLocationDto): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: updateLocationDto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${updateLocationDto.vehicleId} not found`);
    }

    // Validate GPS coordinates
    this.validateGPSCoordinates(updateLocationDto.location);

    // Update vehicle location and timestamp
    vehicle.currentLocation = updateLocationDto.location;
    vehicle.lastUpdated = new Date();

    const updatedVehicle = await this.vehicleRepository.save(vehicle);
    const vehicleData = this.mapEntityToVehicle(updatedVehicle);

    // Create location update object for WebSocket broadcast
    const locationUpdate: VehicleLocationUpdate = {
      vehicleId: updateLocationDto.vehicleId,
      location: updateLocationDto.location,
      timestamp: vehicle.lastUpdated,
      speed: updateLocationDto.speed,
      heading: updateLocationDto.heading,
    };

    // Broadcast location update to connected clients
    this.vehicleTrackingGateway.broadcastVehicleLocationUpdate(locationUpdate);

    return vehicleData;
  }

  async updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    vehicle.status = status;
    vehicle.lastUpdated = new Date();

    const updatedVehicle = await this.vehicleRepository.save(vehicle);
    const vehicleData = this.mapEntityToVehicle(updatedVehicle);

    // Broadcast status update to connected clients
    this.vehicleTrackingGateway.broadcastVehicleStatusUpdate(vehicleData);

    return vehicleData;
  }

  async deleteVehicle(id: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    await this.vehicleRepository.remove(vehicle);
  }

  private validateCapacityLimits(type: VehicleType, capacity: any): void {
    // Define capacity limits based on vehicle type
    const limits = {
      '2W': { maxWeight: 150, maxVolume: 500000 }, // 150kg, 0.5 cubic meters
      '4W': { maxWeight: 1000, maxVolume: 10000000 }, // 1000kg, 10 cubic meters
    };

    const limit = limits[type];
    if (capacity.maxWeight > limit.maxWeight) {
      throw new BadRequestException(`Maximum weight for ${type} vehicle cannot exceed ${limit.maxWeight}kg`);
    }
    if (capacity.maxVolume > limit.maxVolume) {
      throw new BadRequestException(`Maximum volume for ${type} vehicle cannot exceed ${limit.maxVolume}cm³`);
    }
  }

  private validateGPSCoordinates(location: { latitude: number; longitude: number }): void {
    if (location.latitude < -90 || location.latitude > 90) {
      throw new BadRequestException('Invalid latitude: must be between -90 and 90');
    }
    if (location.longitude < -180 || location.longitude > 180) {
      throw new BadRequestException('Invalid longitude: must be between -180 and 180');
    }
  }

  private mapEntityToVehicle(entity: VehicleEntity): Vehicle {
    return {
      id: entity.id,
      registrationNumber: entity.registrationNumber,
      type: entity.type,
      driverId: entity.driverId,
      capacity: entity.capacity,
      currentLocation: entity.currentLocation,
      currentRoute: entity.currentRoute,
      status: entity.status,
      eligibilityScore: parseFloat(entity.eligibilityScore.toString()),
      lastUpdated: entity.lastUpdated,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}