import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ParcelEntity } from '../entities/parcel.entity';
import { CreateParcelDto, UpdateParcelStatusDto } from '@pdcp/shared';
import { Parcel, ParcelStatus, PaginatedResponse, PaginationParams } from '@pdcp/types';

@Injectable()
export class ParcelService {
  constructor(
    @InjectRepository(ParcelEntity)
    private readonly parcelRepository: Repository<ParcelEntity>,
  ) {}

  async createParcel(createParcelDto: CreateParcelDto): Promise<Parcel> {
    // Check if tracking number already exists
    const existingParcel = await this.parcelRepository.findOne({
      where: { trackingNumber: createParcelDto.trackingNumber },
    });

    if (existingParcel) {
      throw new BadRequestException(`Parcel with tracking number ${createParcelDto.trackingNumber} already exists`);
    }

    const parcel = new ParcelEntity();
    parcel.trackingNumber = createParcelDto.trackingNumber;
    parcel.setSender(createParcelDto.sender);
    parcel.setRecipient(createParcelDto.recipient);
    parcel.pickupLocation = createParcelDto.pickupLocation;
    parcel.deliveryLocation = createParcelDto.deliveryLocation;
    parcel.slaDeadline = new Date(createParcelDto.slaDeadline);
    parcel.weight = createParcelDto.weight;
    parcel.setDimensions(createParcelDto.dimensions);
    parcel.valueAmount = createParcelDto.value;
    parcel.priority = createParcelDto.priority;
    parcel.status = ParcelStatus.PENDING;

    const savedParcel = await this.parcelRepository.save(parcel);
    return this.mapEntityToParcel(savedParcel);
  }

  async findParcelById(id: string): Promise<Parcel> {
    const parcel = await this.parcelRepository.findOne({ where: { id } });
    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${id} not found`);
    }
    return this.mapEntityToParcel(parcel);
  }

  async findParcelByTrackingNumber(trackingNumber: string): Promise<Parcel> {
    const parcel = await this.parcelRepository.findOne({ where: { trackingNumber } });
    if (!parcel) {
      throw new NotFoundException(`Parcel with tracking number ${trackingNumber} not found`);
    }
    return this.mapEntityToParcel(parcel);
  }

  async findParcels(params: PaginationParams, filters?: {
    status?: ParcelStatus;
    assignedVehicleId?: string;
    priority?: string;
  }): Promise<PaginatedResponse<Parcel>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'DESC' } = params;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<ParcelEntity> = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.assignedVehicleId) {
      where.assignedVehicleId = filters.assignedVehicleId;
    }
    if (filters?.priority) {
      where.priority = filters.priority as any;
    }

    const [parcels, total] = await this.parcelRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
    });

    return {
      items: parcels.map(parcel => this.mapEntityToParcel(parcel)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateParcelStatus(updateDto: UpdateParcelStatusDto): Promise<Parcel> {
    const parcel = await this.parcelRepository.findOne({ where: { id: updateDto.parcelId } });
    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${updateDto.parcelId} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(parcel.status, updateDto.status);

    parcel.status = updateDto.status;
    
    // Update location if provided
    if (updateDto.location) {
      // For simplicity, we'll update the delivery location for tracking purposes
      // In a real system, you might want to track location history
      if (updateDto.status === ParcelStatus.IN_TRANSIT || updateDto.status === ParcelStatus.DELIVERED) {
        parcel.deliveryLocation = updateDto.location;
      }
    }

    const savedParcel = await this.parcelRepository.save(parcel);
    return this.mapEntityToParcel(savedParcel);
  }

  async assignParcelToVehicle(parcelId: string, vehicleId: string): Promise<Parcel> {
    const parcel = await this.parcelRepository.findOne({ where: { id: parcelId } });
    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${parcelId} not found`);
    }

    if (parcel.status !== ParcelStatus.PENDING) {
      throw new BadRequestException(`Cannot assign parcel with status ${parcel.status}. Only PENDING parcels can be assigned.`);
    }

    parcel.assignedVehicleId = vehicleId;
    parcel.assignedAt = new Date();
    parcel.status = ParcelStatus.ASSIGNED;

    const savedParcel = await this.parcelRepository.save(parcel);
    return this.mapEntityToParcel(savedParcel);
  }

  async completeDelivery(parcelId: string, location?: { latitude: number; longitude: number }): Promise<Parcel> {
    const parcel = await this.parcelRepository.findOne({ where: { id: parcelId } });
    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${parcelId} not found`);
    }

    if (parcel.status !== ParcelStatus.IN_TRANSIT) {
      throw new BadRequestException(`Cannot complete delivery for parcel with status ${parcel.status}. Only IN_TRANSIT parcels can be delivered.`);
    }

    parcel.status = ParcelStatus.DELIVERED;
    if (location) {
      parcel.deliveryLocation = location;
    }

    const savedParcel = await this.parcelRepository.save(parcel);
    return this.mapEntityToParcel(savedParcel);
  }

  async getPendingParcels(): Promise<Parcel[]> {
    const parcels = await this.parcelRepository.find({
      where: { status: ParcelStatus.PENDING },
      order: { priority: 'DESC', slaDeadline: 'ASC' },
    });
    return parcels.map(parcel => this.mapEntityToParcel(parcel));
  }

  async getParcelsByVehicle(vehicleId: string): Promise<Parcel[]> {
    const parcels = await this.parcelRepository.find({
      where: { assignedVehicleId: vehicleId },
      order: { assignedAt: 'ASC' },
    });
    return parcels.map(parcel => this.mapEntityToParcel(parcel));
  }

  private validateStatusTransition(currentStatus: ParcelStatus, newStatus: ParcelStatus): void {
    const validTransitions: Record<ParcelStatus, ParcelStatus[]> = {
      [ParcelStatus.PENDING]: [ParcelStatus.ASSIGNED, ParcelStatus.FAILED],
      [ParcelStatus.ASSIGNED]: [ParcelStatus.IN_TRANSIT, ParcelStatus.PENDING, ParcelStatus.FAILED],
      [ParcelStatus.IN_TRANSIT]: [ParcelStatus.DELIVERED, ParcelStatus.FAILED],
      [ParcelStatus.DELIVERED]: [], // Terminal state
      [ParcelStatus.FAILED]: [ParcelStatus.PENDING], // Can retry
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private mapEntityToParcel(entity: ParcelEntity): Parcel {
    return {
      id: entity.id,
      trackingNumber: entity.trackingNumber,
      sender: entity.sender,
      recipient: entity.recipient,
      pickupLocation: entity.pickupLocation,
      deliveryLocation: entity.deliveryLocation,
      slaDeadline: entity.slaDeadline,
      weight: entity.weight,
      dimensions: entity.dimensions,
      value: entity.valueAmount,
      priority: entity.priority,
      status: entity.status,
      assignedVehicleId: entity.assignedVehicleId,
      assignedAt: entity.assignedAt,
      custodyChain: [], // Will be populated by custody service
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}