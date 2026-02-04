import { IsString, IsUUID, IsDateString, IsBoolean, ValidateNested, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoCoordinateDto } from './common.validators';

export class CustodyTransferDto {
  @IsUUID()
  parcelId: string;

  @IsString()
  fromParty: string;

  @IsString()
  toParty: string;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  location: GeoCoordinateDto;

  @IsString()
  signature: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CustodyRecordDto {
  @IsUUID()
  id: string;

  @IsUUID()
  parcelId: string;

  @IsString()
  fromParty: string;

  @IsString()
  toParty: string;

  @IsDateString()
  timestamp: string;

  @ValidateNested()
  @Type(() => GeoCoordinateDto)
  location: GeoCoordinateDto;

  @IsString()
  digitalSignature: string;

  @IsOptional()
  @IsString()
  blockchainTxHash?: string;

  @IsBoolean()
  verified: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class VerifyCustodyChainDto {
  @IsUUID()
  parcelId: string;

  @IsOptional()
  @IsString()
  expectedChainHash?: string;
}