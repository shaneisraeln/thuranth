import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { VehicleService } from '../services/vehicle.service';
import { CreateVehicleDto, UpdateVehicleLocationDto } from '@pdcp/shared';
import { Vehicle, VehicleType, VehicleStatus } from '@pdcp/types';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid vehicle data or registration number already exists' })
  async createVehicle(@Body() createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    return this.vehicleService.createVehicle(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiQuery({ name: 'type', enum: ['2W', '4W'], required: false, description: 'Filter by vehicle type' })
  @ApiQuery({ name: 'status', enum: ['AVAILABLE', 'ON_ROUTE', 'OFFLINE', 'MAINTENANCE'], required: false, description: 'Filter by vehicle status' })
  @ApiResponse({ status: 200, description: 'List of vehicles retrieved successfully' })
  async findAllVehicles(
    @Query('type') type?: VehicleType,
    @Query('status') status?: VehicleStatus,
  ): Promise<Vehicle[]> {
    if (type) {
      return this.vehicleService.findVehiclesByType(type);
    }
    if (status === 'AVAILABLE') {
      return this.vehicleService.findAvailableVehicles();
    }
    return this.vehicleService.findAllVehicles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findVehicleById(@Param('id', ParseUUIDPipe) id: string): Promise<Vehicle> {
    return this.vehicleService.findVehicleById(id);
  }

  @Put(':id/location')
  @ApiOperation({ summary: 'Update vehicle location' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Vehicle location updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({ status: 400, description: 'Invalid GPS coordinates' })
  async updateVehicleLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: Omit<UpdateVehicleLocationDto, 'vehicleId'>,
  ): Promise<Vehicle> {
    const updateDto: UpdateVehicleLocationDto = {
      vehicleId: id,
      ...updateLocationDto,
    };
    return this.vehicleService.updateVehicleLocation(updateDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update vehicle status' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Vehicle status updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateVehicleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: VehicleStatus,
  ): Promise<Vehicle> {
    return this.vehicleService.updateVehicleStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete vehicle' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({ status: 204, description: 'Vehicle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async deleteVehicle(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehicleService.deleteVehicle(id);
  }

  @Get('available/count')
  @ApiOperation({ summary: 'Get count of available vehicles' })
  @ApiResponse({ status: 200, description: 'Available vehicle count retrieved successfully' })
  async getAvailableVehicleCount(): Promise<{ count: number }> {
    const vehicles = await this.vehicleService.findAvailableVehicles();
    return { count: vehicles.length };
  }
}