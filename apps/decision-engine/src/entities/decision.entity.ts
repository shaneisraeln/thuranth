import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DecisionExplanation } from '@pdcp/types';

@Entity('decisions')
export class DecisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  parcelId: string;

  @Column({ type: 'timestamp' })
  requestTimestamp: Date;

  @Column({ nullable: true })
  recommendedVehicleId?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'jsonb' })
  explanation: DecisionExplanation;

  @Column({ default: false })
  shadowMode: boolean;

  @Column({ default: false })
  executed: boolean;

  @Column({ default: false })
  overridden: boolean;

  @Column({ nullable: true })
  overrideReason?: string;

  @Column({ nullable: true })
  overrideUserId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}