import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SecurityEventType, SecurityEventSeverity } from '../interfaces/auth.interfaces';
import { User } from './user.entity';

@Entity('security_events')
@Index(['type'])
@Index(['severity'])
@Index(['timestamp'])
@Index(['userId'])
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SecurityEventType
  })
  type: SecurityEventType;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  email?: string;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column('jsonb', { default: {} })
  details: Record<string, any>;

  @Column({
    type: 'enum',
    enum: SecurityEventSeverity,
    default: SecurityEventSeverity.LOW
  })
  severity: SecurityEventSeverity;

  @CreateDateColumn()
  timestamp: Date;
}