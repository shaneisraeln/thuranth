import { IsString, IsUUID, IsDateString, IsBoolean, ValidateNested, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoCoordinateDto } from './common.validators';

export class RoutePointDto {
  @IsUUID()
  id: string;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  location: GeoCoordinateDto;

  @IsString()
  address: string;

  @IsDateString()
  estimatedArrival: string;

  @IsBoolean()
  completed: boolean;

  @IsArray()
  @IsUUID(undefined, { each: true })
  parcelIds: string[];
}

export class CreateRouteDto {
  @IsUUID()
  vehicleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  routePoints: RoutePointDto[];
}

export class UpdateRouteDto {
  @IsUUID()
  routeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  routePoints: RoutePointDto[];
}

export class CompleteRoutePointDto {
  @IsUUID()
  routePointId: string;

  @IsDateString()
  completedAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}