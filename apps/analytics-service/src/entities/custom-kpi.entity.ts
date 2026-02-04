import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { KPICategory, UpdateFrequency } from '../interfaces/advanced-analytics.interfaces';

@Entity('custom_kpis')
@Index(['name'])
@Index(['category'])
@Index(['owner'])
@Index(['isActive'])
export class CustomKPIEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  formula: string;

  @Column({ length: 20 })
  unit: string;

  @Column({
    type: 'enum',
    enum: KPICategory,
    default: KPICategory.CUSTOM
  })
  category: KPICategory;

  @Column()
  owner: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  target?: number;

  @Column({
    type: 'enum',
    enum: UpdateFrequency,
    default: UpdateFrequency.DAILY
  })
  updateFrequency: UpdateFrequency;

  @Column({ type: 'simple-array' })
  dataSource: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  lastCalculatedValue?: number;

  @Column({ nullable: true })
  lastCalculatedAt?: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}