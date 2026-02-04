import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_metrics')
@Index(['metricName'])
@Index(['metricType'])
@Index(['periodStart', 'periodEnd'])
@Index(['serviceName'])
@Index(['calculatedAt'])
export class AnalyticsMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metric_name', length: 100 })
  metricName: string;

  @Column({ name: 'metric_type', length: 50 })
  metricType: string; // 'counter', 'gauge', 'histogram', 'summary'

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value: number;

  @Column({ length: 20, nullable: true })
  unit?: string; // 'count', 'kg', 'km', 'minutes', 'percentage', etc.

  @Column({ type: 'jsonb', default: '{}' })
  dimensions: Record<string, any>;

  @Column({ name: 'period_start', type: 'timestamp with time zone' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp with time zone' })
  periodEnd: Date;

  @Column({ name: 'service_name', length: 100, nullable: true })
  serviceName?: string;

  @Column({ name: 'calculated_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}