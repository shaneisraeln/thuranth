import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DecisionEntity } from './decision.entity';
import { 
  OverrideStatus, 
  OverrideRiskLevel, 
  ApprovalStep, 
  OverrideImpactAssessment 
} from '../interfaces/override.interfaces';

@Entity('overrides')
export class OverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  decisionId: string;

  @ManyToOne(() => DecisionEntity)
  @JoinColumn({ name: 'decisionId' })
  decision: DecisionEntity;

  @Column()
  parcelId: string;

  @Column({ nullable: true })
  requestedVehicleId?: string;

  @Column()
  reason: string;

  @Column({ type: 'text' })
  justification: string;

  @Column()
  requestedBy: string;

  @Column({ default: false })
  bypassesSLA: boolean;

  @Column({
    type: 'enum',
    enum: OverrideRiskLevel
  })
  riskLevel: OverrideRiskLevel;

  @Column({
    type: 'enum',
    enum: OverrideStatus,
    default: OverrideStatus.PENDING
  })
  status: OverrideStatus;

  @Column({ type: 'jsonb' })
  approvalChain: ApprovalStep[];

  @Column({ type: 'jsonb', nullable: true })
  impactAssessment?: OverrideImpactAssessment;

  @Column({ nullable: true })
  approvedBy?: string;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  rejectedBy?: string;

  @Column({ nullable: true })
  rejectedAt?: Date;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  executedAt?: Date;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  get isPending(): boolean {
    return this.status === OverrideStatus.PENDING && !this.isExpired;
  }

  get canBeExecuted(): boolean {
    return this.status === OverrideStatus.APPROVED && !this.isExpired && !this.executedAt;
  }
}