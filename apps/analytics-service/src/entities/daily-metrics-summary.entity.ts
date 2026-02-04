import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('daily_metrics_summary')
@Unique(['date'])
@Index(['date'])
@Index(['consolidationRate'])
@Index(['avgVehicleUtilization'])
export class DailyMetricsSummaryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date;

  // Primary metrics
  @Column({ name: 'vehicles_avoided', type: 'integer', default: 0 })
  vehiclesAvoided: number;

  @Column({ name: 'total_parcels_processed', type: 'integer', default: 0 })
  totalParcelsProcessed: number;

  @Column({ name: 'successful_consolidations', type: 'integer', default: 0 })
  successfulConsolidations: number;

  @Column({ name: 'consolidation_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  consolidationRate: number; // percentage

  // Utilization metrics
  @Column({ name: 'avg_vehicle_utilization', type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgVehicleUtilization: number; // percentage

  @Column({ name: 'total_distance_saved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDistanceSaved: number; // km

  @Column({ name: 'total_fuel_saved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalFuelSaved: number; // liters

  // Environmental impact
  @Column({ name: 'co2_emissions_saved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  co2EmissionsSaved: number; // kg

  // SLA metrics
  @Column({ name: 'sla_adherence_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  slaAdherenceRate: number; // percentage

  @Column({ name: 'avg_delivery_time', type: 'decimal', precision: 8, scale: 2, default: 0 })
  avgDeliveryTime: number; // minutes

  // Decision engine metrics
  @Column({ name: 'avg_decision_time', type: 'decimal', precision: 8, scale: 2, default: 0 })
  avgDecisionTime: number; // milliseconds

  @Column({ name: 'shadow_mode_accuracy', type: 'decimal', precision: 5, scale: 2, default: 0 })
  shadowModeAccuracy: number; // percentage

  @Column({ name: 'manual_override_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  manualOverrideRate: number; // percentage

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}