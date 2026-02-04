import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { IsString, IsNotEmpty, IsDate, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustodyTransfer } from '@pdcp/types';

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('custody_queue')
@Index(['status'])
@Index(['createdAt'])
@Index(['retryCount'])
export class CustodyQueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  custodyTransfer: CustodyTransfer;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.PENDING })
  @IsEnum(QueueStatus)
  status: QueueStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  blockchainTxHash?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  processedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}