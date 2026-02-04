import { IsEnum, IsString, IsNumber, IsUUID, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, ParcelStatus, PriorityEnum } from '@pdcp/types';
import { GeoCoordinateDto, DimensionsDto, ContactInfoDto } from './common.validators';

export class CreateParcelDto {
  @IsString()
  trackingNumber: string;

  @ValidateNested()
  @Type(() => ContactInfoDto)
  sender: ContactInfoDto;

  @ValidateNested()
  @Type(() => ContactInfoDto)
  recipient: ContactInfoDto;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  pickupLocation: GeoCoordinateDto;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  deliveryLocation: GeoCoordinateDto;

  @IsDateString()
  slaDeadline: string;

  @IsNumber()
  @Min(0)
  weight: number;

  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions: DimensionsDto;

  @IsNumber()
  @Min(0)
  value: number;

  @IsEnum(PriorityEnum)
  priority: Priority;
}

export class UpdateParcelStatusDto {
  @IsUUID()
  parcelId: string;

  @IsEnum(ParcelStatus)
  status: ParcelStatus;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  location?: GeoCoordinateDto;

  @IsString()
  notes?: string;
}