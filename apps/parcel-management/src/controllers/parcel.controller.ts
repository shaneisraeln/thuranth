import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ParcelService } from '../services/parcel.service';
import { CreateParcelDto, UpdateParcelStatusDto } from '@pdcp/shared';
import { Parcel, ParcelStatus, PaginatedResponse, ApiResponse as ApiResponseType } from '@pdcp/types';

@ApiTags('parcels')
@Controller('parcels')
export class ParcelController {
  constructor(private readonly parcelService: ParcelService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new parcel' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Parcel created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid parcel data' })
  async createParcel(@Body(ValidationPipe) createParcelDto: CreateParcelDto): Promise<ApiResponseType<Parcel>> {
    const parcel = await this.parcelService.createParcel(createParcelDto);
    return {
      success: true,
      data: parcel,
      timestamp: new Date(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get parcels with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: ParcelStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'vehicleId', required: false, type: String, description: 'Filter by assigned vehicle' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Filter by priority' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  async getParcels(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: ParcelStatus,
    @Query('vehicleId') vehicleId?: string,
    @Query('priority') priority?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<ApiResponseType<PaginatedResponse<Parcel>>> {
    const paginationParams = {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      sortBy,
      sortOrder,
    };

    const filters = {
      status,
      assignedVehicleId: vehicleId,
      priority,
    };

    const result = await this.parcelService.findParcels(paginationParams, filters);
    return {
      success: true,
      data: result,
      timestamp: new Date(),
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending parcels ordered by priority and SLA deadline' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pending parcels retrieved successfully' })
  async getPendingParcels(): Promise<ApiResponseType<Parcel[]>> {
    const parcels = await this.parcelService.getPendingParcels();
    return {
      success: true,
      data: parcels,
      timestamp: new Date(),
    };
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get parcels assigned to a specific vehicle' })
  @ApiParam({ name: 'vehicleId', type: String, description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle parcels retrieved successfully' })
  async getParcelsByVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<ApiResponseType<Parcel[]>> {
    const parcels = await this.parcelService.getParcelsByVehicle(vehicleId);
    return {
      success: true,
      data: parcels,
      timestamp: new Date(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get parcel by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Parcel ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Parcel retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Parcel not found' })
  async getParcelById(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseType<Parcel>> {
    const parcel = await this.parcelService.findParcelById(id);
    return {
      success: true,
      data: parcel,
      timestamp: new Date(),
    };
  }

  @Get('tracking/:trackingNumber')
  @ApiOperation({ summary: 'Get parcel by tracking number' })
  @ApiParam({ name: 'trackingNumber', type: String, description: 'Parcel tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Parcel retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Parcel not found' })
  async getParcelByTrackingNumber(
    @Param('trackingNumber') trackingNumber: string,
  ): Promise<ApiResponseType<Parcel>> {
    const parcel = await this.parcelService.findParcelByTrackingNumber(trackingNumber);
    return {
      success: true,
      data: parcel,
      timestamp: new Date(),
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update parcel status' })
  @ApiParam({ name: 'id', type: String, description: 'Parcel ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Parcel status updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Parcel not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition' })
  async updateParcelStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: Omit<UpdateParcelStatusDto, 'parcelId'>,
  ): Promise<ApiResponseType<Parcel>> {
    const parcel = await this.parcelService.updateParcelStatus({
      ...updateDto,
      parcelId: id,
    });
    return {
      success: true,
      data: parcel,
      timestamp: new Date(),
    };
  }

  @Put(':id/assign/:vehicleId')
  @ApiOperation({ summary: 'Assign parcel to vehicle' })
  @ApiParam({ name: 'id', type: String, description: 'Parcel ID' })
  @ApiParam({ name: 'vehicleId', type: String, description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Parcel assigned successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Parcel not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot assign parcel in current status' })
  async assignParcelToVehicle(
    @Param('id', ParseUUIDPipe) parcelId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<ApiResponseType<Parcel>> {
    const parcel = await this.parcelService.assignParcelToVehicle(parcelId, vehicleId);
    return {
      success: true,
      data: parcel,
      timestamp: new Date(),
    };
  }

  @Put(':id/deliver')
  @ApiOperation({ summary: 'Complete parcel delivery' })
  @ApiParam({ name: 'id', type: String, description: 'Parcel ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery completed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Parcel not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot complete delivery in current status' })
  async completeDelivery(
    @Param('id', ParseUUIDPipe) parcelId: string,
    @Body() body?: { location?: { latitude: number; longitude: number } },
  ): Promise<ApiResponseType<Parcel>> {
    const parcel = await this.parcelService.completeDelivery(parcelId, body?.location);
    return {
      success: true,
      data: parcel,
      timestamp: new Date(),
    };
  }
}