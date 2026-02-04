import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { IsString, IsNotEmpty, IsDate, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoCoordinate } from '@pdcp/types';

@Entity('custody_records')
@Index(['parcelId'])
@Index(['fromParty'])
@Index(['toParty'])
@Index(['timestamp'])
export class CustodyRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  parcelId: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  fromParty: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  toParty: string;

  @Column({ type: 'timestamp' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  location: GeoCoordinate;

  @Column({ type: 'text' })
  @IsString()
  @IsNotEmpty()
  digitalSignature: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  blockchainTxHash?: string;

  @Column({ default: false })
  @IsBoolean()
  verified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}