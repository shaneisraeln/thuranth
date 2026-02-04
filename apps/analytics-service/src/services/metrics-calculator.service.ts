import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsMetricEntity } from '../entities/analytics-metric.entity';
import { DailyMetricsSummaryEntity } from '../entities/daily-metrics-summary.entity';
import { 
  MetricRequest, 
  MetricFilter, 
  ConsolidationEvent,
  VehicleUtilizationData,
  SLAPerformanceData,
  DecisionPerformanceData,
  EmissionsCalculationParams,
  EmissionsResult,
} from '../interfaces/analytics.interfaces';

@Injectable()
export class MetricsCalculatorService {
  private readonly logger = new Logger(MetricsCalculatorService.name);

  // Emission factors (kg CO2 per liter of fuel)
  private readonly EMISSION_FACTORS = {
    petrol: 2.31, // kg CO2 per liter
    diesel: 2.68, // kg CO2 per liter
    electric: 0.5, // kg CO2 per kWh (grid average)
  };

  // Fuel consumption rates (liters per 100km)
  private readonly FUEL_CONSUMPTION = {
    '2W': { petrol: 2.5, diesel: 2.0 },
    '4W': { petrol: 8.0, diesel: 6.5 },
  };

  constructor(
    @InjectRepository(AnalyticsMetricEntity)
    private readonly metricsRepository: Repository<AnalyticsMetricEntity>,
    @InjectRepository(DailyMetricsSummaryEntity)
    private readonly dailySummaryRepository: Repository<DailyMetricsSummaryEntity>,
  ) {}

  /**
   * Record a consolidation event and calculate impact metrics
   */
  async recordConsolidationEvent(event: ConsolidationEvent): Promise<void> {
    const metrics: MetricRequest[] = [
      {
        metricName: 'vehicles_avoided',
        metricType: 'counter',
        value: 1,
        unit: 'count',
        dimensions: { parcelId: event.parcelId },
        periodStart: event.timestamp,
        periodEnd: event.timestamp,
        serviceName: 'analytics-service',
      },
      {
        metricName: 'distance_saved',
        metricType: 'gauge',
        value: event.distanceSaved,
        unit: 'km',
        dimensions: { parcelId: event.parcelId },
        periodStart: event.timestamp,
        periodEnd: event.timestamp,
        serviceName: 'analytics-service',
      },
      {
        metricName: 'fuel_saved',
        metricType: 'gauge',
        value: event.fuelSaved,
        unit: 'liters',
        dimensions: { parcelId: event.parcelId },
        periodStart: event.timestamp,
        periodEnd: event.timestamp,
        serviceName: 'analytics-service',
      },
      {
        metricName: 'co2_emissions_saved',
        metricType: 'gauge',
        value: event.co2Saved,
        unit: 'kg',
        dimensions: { parcelId: event.parcelId },
        periodStart: event.timestamp,
        periodEnd: event.timestamp,
        serviceName: 'analytics-service',
      },
    ];

    await Promise.all(metrics.map(metric => this.recordMetric(metric)));
    this.logger.log(`Consolidation event recorded for parcel ${event.parcelId}`);
  }

  /**
   * Record vehicle utilization data
   */
  async recordVehicleUtilization(data: VehicleUtilizationData): Promise<void> {
    const metric: MetricRequest = {
      metricName: 'vehicle_utilization',
      metricType: 'gauge',
      value: data.utilizationPercentage,
      unit: 'percentage',
      dimensions: { 
        vehicleId: data.vehicleId,
        vehicleType: data.vehicleType,
      },
      periodStart: data.timestamp,
      periodEnd: data.timestamp,
      serviceName: 'analytics-service',
    };

    await this.recordMetric(metric);
    this.logger.debug(`Vehicle utilization recorded for ${data.vehicleId}: ${data.utilizationPercentage}%`);
  }

  /**
   * Record SLA performance data
   */
  async recordSLAPerformance(data: SLAPerformanceData): Promise<void> {
    const adherenceValue = data.adherenceStatus === 'met' ? 1 : 0;
    const deliveryTimeMinutes = (data.actualDeliveryTime.getTime() - data.slaDeadline.getTime()) / (1000 * 60);

    const metrics: MetricRequest[] = [
      {
        metricName: 'sla_adherence',
        metricType: 'counter',
        value: adherenceValue,
        unit: 'count',
        dimensions: { 
          parcelId: data.parcelId,
          status: data.adherenceStatus,
        },
        periodStart: data.actualDeliveryTime,
        periodEnd: data.actualDeliveryTime,
        serviceName: 'analytics-service',
      },
      {
        metricName: 'delivery_time',
        metricType: 'gauge',
        value: deliveryTimeMinutes,
        unit: 'minutes',
        dimensions: { parcelId: data.parcelId },
        periodStart: data.actualDeliveryTime,
        periodEnd: data.actualDeliveryTime,
        serviceName: 'analytics-service',
      },
    ];

    await Promise.all(metrics.map(metric => this.recordMetric(metric)));
    this.logger.debug(`SLA performance recorded for parcel ${data.parcelId}: ${data.adherenceStatus}`);
  }

  /**
   * Record decision engine performance data
   */
  async recordDecisionPerformance(data: DecisionPerformanceData): Promise<void> {
    const metrics: MetricRequest[] = [
      {
        metricName: 'decision_processing_time',
        metricType: 'gauge',
        value: data.processingTimeMs,
        unit: 'milliseconds',
        dimensions: { 
          decisionId: data.decisionId,
          shadowMode: data.shadowMode.toString(),
        },
        periodStart: data.timestamp,
        periodEnd: data.timestamp,
        serviceName: 'analytics-service',
      },
    ];

    if (data.overridden) {
      metrics.push({
        metricName: 'manual_overrides',
        metricType: 'counter',
        value: 1,
        unit: 'count',
        dimensions: { decisionId: data.decisionId },
        periodStart: data.timestamp,
        periodEnd: data.timestamp,
        serviceName: 'analytics-service',
      });
    }

    await Promise.all(metrics.map(metric => this.recordMetric(metric)));
    this.logger.debug(`Decision performance recorded for ${data.decisionId}`);
  }

  /**
   * Calculate carbon emissions for consolidation events
   */
  calculateEmissions(params: EmissionsCalculationParams): EmissionsResult {
    const { vehicleType, distanceKm, fuelType = 'petrol' } = params;
    
    // Calculate fuel consumption
    const consumptionPer100km = this.FUEL_CONSUMPTION[vehicleType][fuelType];
    const fuelLiters = (distanceKm * consumptionPer100km) / 100;
    
    // Calculate CO2 emissions
    const co2Kg = fuelLiters * this.EMISSION_FACTORS[fuelType];
    
    return {
      co2Kg: Math.round(co2Kg * 100) / 100, // Round to 2 decimal places
      fuelLiters: Math.round(fuelLiters * 100) / 100,
      calculationMethod: `${vehicleType}_${fuelType}_standard`,
    };
  }

  /**
   * Record a metric
   */
  async recordMetric(request: MetricRequest): Promise<AnalyticsMetricEntity> {
    const metric = this.metricsRepository.create({
      metricName: request.metricName,
      metricType: request.metricType,
      value: request.value,
      unit: request.unit,
      dimensions: request.dimensions || {},
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      serviceName: request.serviceName,
    });

    return this.metricsRepository.save(metric);
  }

  /**
   * Get metrics with filtering
   */
  async getMetrics(filter: MetricFilter): Promise<AnalyticsMetricEntity[]> {
    const queryBuilder = this.metricsRepository.createQueryBuilder('metric');

    if (filter.metricName) {
      queryBuilder.andWhere('metric.metricName = :metricName', { metricName: filter.metricName });
    }

    if (filter.metricType) {
      queryBuilder.andWhere('metric.metricType = :metricType', { metricType: filter.metricType });
    }

    if (filter.serviceName) {
      queryBuilder.andWhere('metric.serviceName = :serviceName', { serviceName: filter.serviceName });
    }

    if (filter.startDate && filter.endDate) {
      queryBuilder.andWhere('metric.periodStart BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    }

    if (filter.dimensions) {
      Object.entries(filter.dimensions).forEach(([key, value], index) => {
        queryBuilder.andWhere(`metric.dimensions ->> :key${index} = :value${index}`, {
          [`key${index}`]: key,
          [`value${index}`]: value,
        });
      });
    }

    queryBuilder.orderBy('metric.calculatedAt', 'DESC');

    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Calculate and store daily metrics summary
   */
  async calculateDailySummary(date: Date): Promise<DailyMetricsSummaryEntity> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate primary metrics
    const vehiclesAvoided = await this.sumMetricValue('vehicles_avoided', startOfDay, endOfDay);
    const totalParcelsProcessed = await this.countUniqueParcelIds(startOfDay, endOfDay);
    const successfulConsolidations = vehiclesAvoided;
    const consolidationRate = totalParcelsProcessed > 0 ? (successfulConsolidations / totalParcelsProcessed) * 100 : 0;

    // Calculate utilization metrics
    const avgVehicleUtilization = await this.averageMetricValue('vehicle_utilization', startOfDay, endOfDay);
    const totalDistanceSaved = await this.sumMetricValue('distance_saved', startOfDay, endOfDay);
    const totalFuelSaved = await this.sumMetricValue('fuel_saved', startOfDay, endOfDay);

    // Calculate environmental impact
    const co2EmissionsSaved = await this.sumMetricValue('co2_emissions_saved', startOfDay, endOfDay);

    // Calculate SLA metrics
    const slaAdherenceRate = await this.calculateSLAAdherenceRate(startOfDay, endOfDay);
    const avgDeliveryTime = await this.averageMetricValue('delivery_time', startOfDay, endOfDay);

    // Calculate decision engine metrics
    const avgDecisionTime = await this.averageMetricValue('decision_processing_time', startOfDay, endOfDay);
    const manualOverrideRate = await this.calculateManualOverrideRate(startOfDay, endOfDay);

    // Create or update daily summary
    let summary = await this.dailySummaryRepository.findOne({ where: { date: startOfDay } });
    
    if (!summary) {
      summary = this.dailySummaryRepository.create({ date: startOfDay });
    }

    summary.vehiclesAvoided = vehiclesAvoided;
    summary.totalParcelsProcessed = totalParcelsProcessed;
    summary.successfulConsolidations = successfulConsolidations;
    summary.consolidationRate = Math.round(consolidationRate * 100) / 100;
    summary.avgVehicleUtilization = Math.round(avgVehicleUtilization * 100) / 100;
    summary.totalDistanceSaved = Math.round(totalDistanceSaved * 100) / 100;
    summary.totalFuelSaved = Math.round(totalFuelSaved * 100) / 100;
    summary.co2EmissionsSaved = Math.round(co2EmissionsSaved * 100) / 100;
    summary.slaAdherenceRate = Math.round(slaAdherenceRate * 100) / 100;
    summary.avgDeliveryTime = Math.round(avgDeliveryTime * 100) / 100;
    summary.avgDecisionTime = Math.round(avgDecisionTime * 100) / 100;
    summary.manualOverrideRate = Math.round(manualOverrideRate * 100) / 100;

    return this.dailySummaryRepository.save(summary);
  }

  /**
   * Get daily summaries for a date range
   */
  async getDailySummaries(startDate: Date, endDate: Date): Promise<DailyMetricsSummaryEntity[]> {
    return this.dailySummaryRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
      order: {
        date: 'ASC',
      },
    });
  }

  private async sumMetricValue(metricName: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.metricsRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'sum')
      .where('metric.metricName = :metricName', { metricName })
      .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result.sum) || 0;
  }

  private async averageMetricValue(metricName: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.metricsRepository
      .createQueryBuilder('metric')
      .select('AVG(metric.value)', 'avg')
      .where('metric.metricName = :metricName', { metricName })
      .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  private async countUniqueParcelIds(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.metricsRepository
      .createQueryBuilder('metric')
      .select('COUNT(DISTINCT metric.dimensions ->> \'parcelId\')', 'count')
      .where('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('metric.dimensions ? \'parcelId\'')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  private async calculateSLAAdherenceRate(startDate: Date, endDate: Date): Promise<number> {
    const totalSLA = await this.metricsRepository
      .createQueryBuilder('metric')
      .where('metric.metricName = :metricName', { metricName: 'sla_adherence' })
      .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const metSLA = await this.sumMetricValue('sla_adherence', startDate, endDate);

    return totalSLA > 0 ? (metSLA / totalSLA) * 100 : 0;
  }

  private async calculateManualOverrideRate(startDate: Date, endDate: Date): Promise<number> {
    const totalDecisions = await this.metricsRepository
      .createQueryBuilder('metric')
      .where('metric.metricName = :metricName', { metricName: 'decision_processing_time' })
      .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const overrides = await this.sumMetricValue('manual_overrides', startDate, endDate);

    return totalDecisions > 0 ? (overrides / totalDecisions) * 100 : 0;
  }
}