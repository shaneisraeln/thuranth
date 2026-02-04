import { IsEnum, IsString, IsNumber, IsUUID, IsDateString, IsBoolean, ValidateNested, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, PriorityEnum } from '@pdcp/types';
import { GeoCoordinateDto, DimensionsDto } from './common.validators';

export class DecisionRequestDto {
  @IsUUID()
  parcelId: string;

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

  @IsEnum(PriorityEnum)
  priority: Priority;
}

export class ConstraintResultDto {
  @IsString()
  name: string;

  @IsEnum(['HARD', 'SOFT'])
  type: 'HARD' | 'SOFT';

  @IsBoolean()
  satisfied: boolean;

  @IsNumber()
  value: number;

  @IsNumber()
  threshold: number;

  @IsString()
  description: string;
}

export class ScoringFactorDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;

  @IsNumber()
  score: number;

  @IsNumber()
  maxScore: number;

  @IsString()
  description: string;
}

export class RiskAssessmentDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  slaRisk: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  capacityRisk: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  routeRisk: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  overallRisk: number;

  @IsArray()
  @IsString({ each: true })
  riskFactors: string[];
}

export class DecisionExplanationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintResultDto)
  hardConstraints: ConstraintResultDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintResultDto)
  softConstraints: ConstraintResultDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoringFactorDto)
  scoringFactors: ScoringFactorDto[];

  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  riskAssessment: RiskAssessmentDto;

  @IsString()
  reasoning: string;
}

export class VehicleOptionDto {
  @IsUUID()
  vehicleId: string;

  @IsNumber()
  score: number;

  @IsDateString()
  estimatedDeliveryTime: string;

  @IsNumber()
  @Min(0)
  routeDeviation: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  capacityUtilization: number;
}

export class ManualOverrideDto {
  @IsUUID()
  decisionId: string;

  @IsUUID()
  selectedVehicleId: string;

  @IsString()
  reason: string;

  @IsUUID()
  userId: string;
}