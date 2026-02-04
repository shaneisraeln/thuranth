import { IsEnum, IsString, IsNumber, IsUUID, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, VehicleTypeEnum } from '@pdcp/types';
import { GeoCoordinateDto } from './common.validators';

export class VehicleCapacityDto {
  @IsNumber()
  @Min(0)
  maxWeight: number;

  @IsNumber()
  @Min(0)
  maxVolume: number;

  @IsNumber()
  @Min(0)
  currentWeight: number;

  @IsNumber()
  @Min(0)
  currentVolume: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  utilizationPercentage: number;
}

export class CreateVehicleDto {
  @IsString()
  registrationNumber: string;

  @IsEnum(VehicleTypeEnum)
  type: VehicleType;

  @IsUUID()
  driverId: string;

  @ValidateNested()
  @Type(() => VehicleCapacityDto)
  capacity: VehicleCapacityDto;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  currentLocation: GeoCoordinateDto;
}

export class UpdateVehicleLocationDto {
  @IsUUID()
  vehicleId: string;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  location: GeoCoordinateDto;

  @IsNumber()
  @Min(0)
  speed?: number;

  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;
}