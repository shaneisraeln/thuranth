import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CapacityService, ParcelDimensions, CapacityUpdateResult } from '../services/capacity.service';
import { VehicleCapacity, VehicleType } from '@pdcp/types';
import { VehicleEntity } from '../entities/vehicle.entity';

class AssignParcelDto {
  weight: number;
  volume: number;
}

class RecalculateCapacityDto {
  parcels: ParcelDimensions[];
}

@ApiTags('capacity')
@Controller('vehicles/:vehicleId/capacity')
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get()
  @ApiOperation({ summary: 'Get vehicle capacity information' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Vehicle capacity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleCapacity(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<VehicleCapacity> {
    return this.capacityService.getVehicleCapacity(vehicleId);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign parcel to vehicle and update capacity' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Parcel assigned and capacity updated successfully' })
  @ApiResponse({ status: 400, description: 'Assignment would exceed vehicle capacity' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async assignParcel(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() assignParcelDto: AssignParcelDto,
  ): Promise<CapacityUpdateResult> {
    return this.capacityService.assignParcelToVehicle(vehicleId, assignParcelDto);
  }

  @Post('remove')
  @ApiOperation({ summary: 'Remove parcel from vehicle and update capacity' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Parcel removed and capacity updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot remove parcel: would result in negative capacity' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async removeParcel(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() removeParcelDto: AssignParcelDto,
  ): Promise<CapacityUpdateResult> {
    return this.capacityService.removeParcelFromVehicle(vehicleId, removeParcelDto);
  }

  @Put('recalculate')
  @ApiOperation({ summary: 'Recalculate vehicle capacity based on current parcels' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle UUID' })
  @ApiResponse({ status: 200, description: 'Vehicle capacity recalculated successfully' })
  @ApiResponse({ status: 400, description: 'Total parcel dimensions exceed vehicle capacity' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async recalculateCapacity(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() recalculateDto: RecalculateCapacityDto,
  ): Promise<VehicleCapacity> {
    return this.capacityService.recalculateVehicleCapacity(vehicleId, recalculateDto.parcels);
  }
}

@ApiTags('capacity')
@Controller('capacity')
export class CapacityStatsController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get('near-full')
  @ApiOperation({ summary: 'Get vehicles that are near full capacity (90%+)' })
  @ApiResponse({ status: 200, description: 'Near-full vehicles retrieved successfully' })
  async getNearFullVehicles(): Promise<VehicleEntity[]> {
    return this.capacityService.getNearFullVehicles();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get capacity utilization statistics' })
  @ApiResponse({ status: 200, description: 'Capacity statistics retrieved successfully' })
  async getCapacityStats(): Promise<{
    totalVehicles: number;
    nearFullVehicles: number;
    averageUtilization: number;
    utilizationByType: Record<VehicleType, number>;
  }> {
    return this.capacityService.getCapacityUtilizationStats();
  }
}