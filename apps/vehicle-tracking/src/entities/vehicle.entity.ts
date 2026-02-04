import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VehicleType, VehicleStatus, VehicleCapacity, GeoCoordinate, RoutePoint } from '@pdcp/types';

@Entity('vehicles')
@Index(['status', 'type'])
@Index(['currentLocation'])
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  registrationNumber: string;

  @Column({
    type: 'enum',
    enum: ['2W', '4W'],
  })
  type: VehicleType;

  @Column('uuid')
  driverId: string;

  @Column('jsonb')
  capacity: VehicleCapacity;

  @Column('jsonb')
  currentLocation: GeoCoordinate;

  @Column('jsonb', { default: [] })
  currentRoute: RoutePoint[];

  @Column({
    type: 'enum',
    enum: ['AVAILABLE', 'ON_ROUTE', 'OFFLINE', 'MAINTENANCE'],
    default: 'AVAILABLE',
  })
  status: VehicleStatus;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  eligibilityScore: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}