import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditEventType {
  DECISION_MADE = 'DECISION_MADE',
  PARCEL_ASSIGNED = 'PARCEL_ASSIGNED',
  PARCEL_STATUS_CHANGED = 'PARCEL_STATUS_CHANGED',
  VEHICLE_LOCATION_UPDATED = 'VEHICLE_LOCATION_UPDATED',
  ROUTE_UPDATED = 'ROUTE_UPDATED',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  CUSTODY_TRANSFER = 'CUSTODY_TRANSFER',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SECURITY_EVENT = 'SECURITY_EVENT',
}

@Entity('audit_logs')
@Index(['eventType'])
@Index(['entityType', 'entityId'])
@Index(['userId'])
@Index(['createdAt'])
@Index(['serviceName'])
@Index(['correlationId'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuditEventType,
    name: 'event_type',
  })
  eventType: AuditEventType;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'event_data', type: 'jsonb', default: '{}' })
  eventData: Record<string, any>;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId?: string;

  @Column({ name: 'service_name', length: 100, nullable: true })
  serviceName?: string;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlationId?: string;

  @Column({ name: 'data_hash', length: 64, nullable: true })
  dataHash?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}