import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleEntity } from '../entities/vehicle.entity';
import { VehicleCapacity, VehicleType } from '@pdcp/types';
import { VehicleTrackingGateway } from '../gateways/vehicle-tracking.gateway';

export interface ParcelDimensions {
  weight: number;
  volume: number;
}

export interface CapacityUpdateResult {
  vehicleId: string;
  previousCapacity: VehicleCapacity;
  newCapacity: VehicleCapacity;
  isNearFull: boolean;
  utilizationChange: number;
}

@Injectable()
export class CapacityService {
  private readonly NEAR_FULL_THRESHOLD = 90; // 90% capacity threshold

  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    private readonly vehicleTrackingGateway: VehicleTrackingGateway,
  ) {}

  async assignParcelToVehicle(
    vehicleId: string,
    parcelDimensions: ParcelDimensions,
  ): Promise<CapacityUpdateResult> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const previousCapacity = { ...vehicle.capacity };

    // Check if assignment would exceed capacity
    const newWeight = vehicle.capacity.currentWeight + parcelDimensions.weight;
    const newVolume = vehicle.capacity.currentVolume + parcelDimensions.volume;

    if (newWeight > vehicle.capacity.maxWeight) {
      throw new BadRequestException(
        `Assignment would exceed weight capacity. Available: ${vehicle.capacity.maxWeight - vehicle.capacity.currentWeight}kg, Required: ${parcelDimensions.weight}kg`
      );
    }

    if (newVolume > vehicle.capacity.maxVolume) {
      throw new BadRequestException(
        `Assignment would exceed volume capacity. Available: ${vehicle.capacity.maxVolume - vehicle.capacity.currentVolume}cm³, Required: ${parcelDimensions.volume}cm³`
      );
    }

    // Update capacity
    const newCapacity = this.calculateUpdatedCapacity(vehicle.capacity, parcelDimensions, 'ADD');
    vehicle.capacity = newCapacity;
    vehicle.lastUpdated = new Date();

    await this.vehicleRepository.save(vehicle);

    const isNearFull = this.isVehicleNearFull(newCapacity);
    const utilizationChange = newCapacity.utilizationPercentage - previousCapacity.utilizationPercentage;

    const result: CapacityUpdateResult = {
      vehicleId,
      previousCapacity,
      newCapacity,
      isNearFull,
      utilizationChange,
    };

    // Broadcast capacity update to connected clients
    this.vehicleTrackingGateway.broadcastCapacityUpdate(vehicleId, result);

    // Send near-full alert if threshold is reached
    if (isNearFull && !this.isVehicleNearFull(previousCapacity)) {
      this.vehicleTrackingGateway.broadcastNearFullAlert(vehicleId, result);
    }

    return result;
  }

  async removeParcelFromVehicle(
    vehicleId: string,
    parcelDimensions: ParcelDimensions,
  ): Promise<CapacityUpdateResult> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const previousCapacity = { ...vehicle.capacity };

    // Check if removal would result in negative capacity
    const newWeight = vehicle.capacity.currentWeight - parcelDimensions.weight;
    const newVolume = vehicle.capacity.currentVolume - parcelDimensions.volume;

    if (newWeight < 0 || newVolume < 0) {
      throw new BadRequestException('Cannot remove parcel: would result in negative capacity');
    }

    // Update capacity
    const newCapacity = this.calculateUpdatedCapacity(vehicle.capacity, parcelDimensions, 'REMOVE');
    vehicle.capacity = newCapacity;
    vehicle.lastUpdated = new Date();

    await this.vehicleRepository.save(vehicle);

    const isNearFull = this.isVehicleNearFull(newCapacity);
    const utilizationChange = newCapacity.utilizationPercentage - previousCapacity.utilizationPercentage;

    const result: CapacityUpdateResult = {
      vehicleId,
      previousCapacity,
      newCapacity,
      isNearFull,
      utilizationChange,
    };

    // Broadcast capacity update to connected clients
    this.vehicleTrackingGateway.broadcastCapacityUpdate(vehicleId, result);

    return result;
  }

  async getVehicleCapacity(vehicleId: string): Promise<VehicleCapacity> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }
    return vehicle.capacity;
  }

  async getNearFullVehicles(): Promise<VehicleEntity[]> {
    const vehicles = await this.vehicleRepository.find();
    return vehicles.filter(vehicle => this.isVehicleNearFull(vehicle.capacity));
  }

  async getCapacityUtilizationStats(): Promise<{
    totalVehicles: number;
    nearFullVehicles: number;
    averageUtilization: number;
    utilizationByType: Record<VehicleType, number>;
  }> {
    const vehicles = await this.vehicleRepository.find();
    
    const nearFullVehicles = vehicles.filter(vehicle => 
      this.isVehicleNearFull(vehicle.capacity)
    ).length;

    const totalUtilization = vehicles.reduce(
      (sum, vehicle) => sum + vehicle.capacity.utilizationPercentage,
      0
    );
    const averageUtilization = vehicles.length > 0 ? totalUtilization / vehicles.length : 0;

    const utilizationByType: Record<VehicleType, number> = {
      '2W': 0,
      '4W': 0,
    };

    const vehiclesByType = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.type]) acc[vehicle.type] = [];
      acc[vehicle.type].push(vehicle);
      return acc;
    }, {} as Record<VehicleType, VehicleEntity[]>);

    Object.keys(utilizationByType).forEach(type => {
      const typeVehicles = vehiclesByType[type as VehicleType] || [];
      if (typeVehicles.length > 0) {
        const typeUtilization = typeVehicles.reduce(
          (sum, vehicle) => sum + vehicle.capacity.utilizationPercentage,
          0
        );
        utilizationByType[type as VehicleType] = typeUtilization / typeVehicles.length;
      }
    });

    return {
      totalVehicles: vehicles.length,
      nearFullVehicles,
      averageUtilization,
      utilizationByType,
    };
  }

  private calculateUpdatedCapacity(
    currentCapacity: VehicleCapacity,
    parcelDimensions: ParcelDimensions,
    operation: 'ADD' | 'REMOVE',
  ): VehicleCapacity {
    const multiplier = operation === 'ADD' ? 1 : -1;
    
    const newWeight = currentCapacity.currentWeight + (parcelDimensions.weight * multiplier);
    const newVolume = currentCapacity.currentVolume + (parcelDimensions.volume * multiplier);

    // Calculate utilization percentage based on the more constraining factor
    const weightUtilization = (newWeight / currentCapacity.maxWeight) * 100;
    const volumeUtilization = (newVolume / currentCapacity.maxVolume) * 100;
    const utilizationPercentage = Math.max(weightUtilization, volumeUtilization);

    return {
      maxWeight: currentCapacity.maxWeight,
      maxVolume: currentCapacity.maxVolume,
      currentWeight: Math.max(0, newWeight),
      currentVolume: Math.max(0, newVolume),
      utilizationPercentage: Math.min(100, Math.max(0, utilizationPercentage)),
    };
  }

  private isVehicleNearFull(capacity: VehicleCapacity): boolean {
    return capacity.utilizationPercentage >= this.NEAR_FULL_THRESHOLD;
  }

  async recalculateVehicleCapacity(vehicleId: string, parcels: ParcelDimensions[]): Promise<VehicleCapacity> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const previousCapacity = { ...vehicle.capacity };

    // Calculate total weight and volume from all parcels
    const totalWeight = parcels.reduce((sum, parcel) => sum + parcel.weight, 0);
    const totalVolume = parcels.reduce((sum, parcel) => sum + parcel.volume, 0);

    // Validate against capacity limits
    if (totalWeight > vehicle.capacity.maxWeight) {
      throw new BadRequestException('Total parcel weight exceeds vehicle capacity');
    }
    if (totalVolume > vehicle.capacity.maxVolume) {
      throw new BadRequestException('Total parcel volume exceeds vehicle capacity');
    }

    // Calculate utilization percentage
    const weightUtilization = (totalWeight / vehicle.capacity.maxWeight) * 100;
    const volumeUtilization = (totalVolume / vehicle.capacity.maxVolume) * 100;
    const utilizationPercentage = Math.max(weightUtilization, volumeUtilization);

    const newCapacity: VehicleCapacity = {
      maxWeight: vehicle.capacity.maxWeight,
      maxVolume: vehicle.capacity.maxVolume,
      currentWeight: totalWeight,
      currentVolume: totalVolume,
      utilizationPercentage: Math.min(100, utilizationPercentage),
    };

    // Update vehicle capacity
    vehicle.capacity = newCapacity;
    vehicle.lastUpdated = new Date();
    await this.vehicleRepository.save(vehicle);

    // Broadcast capacity update
    const result: CapacityUpdateResult = {
      vehicleId,
      previousCapacity,
      newCapacity,
      isNearFull: this.isVehicleNearFull(newCapacity),
      utilizationChange: newCapacity.utilizationPercentage - previousCapacity.utilizationPercentage,
    };

    this.vehicleTrackingGateway.broadcastCapacityUpdate(vehicleId, result);

    return newCapacity;
  }
}