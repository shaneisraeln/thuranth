import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { 
  ImpactMeasurementDashboard,
  PrimaryImpactMetrics,
  SecondaryImpactMetrics,
  EnvironmentalImpactMetrics,
  OperationalEfficiencyMetrics,
  FinancialImpactMetrics,
  MetricWithTrend,
  TrendAnalysisData,
  BenchmarkingData,
  CustomKPIData,
  TrendDirection,
  MetricStatus,
  TimeRange,
  TimeGranularity
} from '../interfaces/advanced-analytics.interfaces';
import { AnalyticsMetricEntity } from '../entities/analytics-metric.entity';
import { DailyMetricsSummaryEntity } from '../entities/daily-metrics-summary.entity';
import { CustomKPIEntity } from '../entities/custom-kpi.entity';
import { MetricsCalculatorService } from './metrics-calculator.service';

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsMetricEntity)
    private readonly metricsRepository: Repository<AnalyticsMetricEntity>,
    @InjectRepository(DailyMetricsSummaryEntity)
    private readonly dailySummaryRepository: Repository<DailyMetricsSummaryEntity>,
    @InjectRepository(CustomKPIEntity)
    private readonly customKPIRepository: Repository<CustomKPIEntity>,
    private readonly metricsCalculator: MetricsCalculatorService,
  ) {}

  /**
   * Generate comprehensive impact measurement dashboard
   */
  async generateImpactMeasurementDashboard(timeRange: TimeRange): Promise<ImpactMeasurementDashboard> {
    this.logger.log(`Generating impact measurement dashboard for ${timeRange.start} to ${timeRange.end}`);

    try {
      const [
        primaryMetrics,
        secondaryMetrics,
        environmentalImpact,
        operationalEfficiency,
        financialImpact,
        trendAnalysis,
        benchmarking,
        customKPIs
      ] = await Promise.all([
        this.calculatePrimaryImpactMetrics(timeRange),
        this.calculateSecondaryImpactMetrics(timeRange),
        this.calculateEnvironmentalImpactMetrics(timeRange),
        this.calculateOperationalEfficiencyMetrics(timeRange),
        this.calculateFinancialImpactMetrics(timeRange),
        this.generateTrendAnalysis(timeRange),
        this.generateBenchmarkingData(timeRange),
        this.calculateCustomKPIs(timeRange)
      ]);

      return {
        primaryMetrics,
        secondaryMetrics,
        environmentalImpact,
        operationalEfficiency,
        financialImpact,
        trendAnalysis,
        benchmarking,
        customKPIs
      };

    } catch (error) {
      this.logger.error('Error generating impact measurement dashboard:', error);
      throw error;
    }
  }

  /**
   * Calculate primary impact metrics with trends
   */
  private async calculatePrimaryImpactMetrics(timeRange: TimeRange): Promise<PrimaryImpactMetrics> {
    const currentPeriod = timeRange;
    const previousPeriod = this.getPreviousPeriod(timeRange);

    const [
      vehiclesAvoidedCurrent,
      vehiclesAvoidedPrevious,
      consolidationRateCurrent,
      consolidationRatePrevious,
      utilizationCurrent,
      utilizationPrevious,
      parcelsConsolidatedCurrent,
      parcelsConsolidatedPrevious
    ] = await Promise.all([
      this.sumMetricValue('vehicles_avoided', currentPeriod.start, currentPeriod.end),
      this.sumMetricValue('vehicles_avoided', previousPeriod.start, previousPeriod.end),
      this.calculateConsolidationRate(currentPeriod.start, currentPeriod.end),
      this.calculateConsolidationRate(previousPeriod.start, previousPeriod.end),
      this.averageMetricValue('vehicle_utilization', currentPeriod.start, currentPeriod.end),
      this.averageMetricValue('vehicle_utilization', previousPeriod.start, previousPeriod.end),
      this.countConsolidatedParcels(currentPeriod.start, currentPeriod.end),
      this.countConsolidatedParcels(previousPeriod.start, previousPeriod.end)
    ]);

    return {
      vehiclesAvoided: this.createMetricWithTrend(
        vehiclesAvoidedCurrent,
        vehiclesAvoidedPrevious,
        'count',
        100 // target
      ),
      consolidationRate: this.createMetricWithTrend(
        consolidationRateCurrent,
        consolidationRatePrevious,
        'percentage',
        75 // target 75%
      ),
      utilizationImprovement: this.createMetricWithTrend(
        utilizationCurrent,
        utilizationPrevious,
        'percentage',
        85 // target 85%
      ),
      parcelsConsolidated: this.createMetricWithTrend(
        parcelsConsolidatedCurrent,
        parcelsConsolidatedPrevious,
        'count',
        500 // target
      )
    };
  }

  /**
   * Calculate secondary impact metrics with trends
   */
  private async calculateSecondaryImpactMetrics(timeRange: TimeRange): Promise<SecondaryImpactMetrics> {
    const currentPeriod = timeRange;
    const previousPeriod = this.getPreviousPeriod(timeRange);

    const [
      fuelSavingsCurrent,
      fuelSavingsPrevious,
      distanceSavedCurrent,
      distanceSavedPrevious,
      timeSavedCurrent,
      timeSavedPrevious,
      slaAdherenceCurrent,
      slaAdherencePrevious
    ] = await Promise.all([
      this.sumMetricValue('fuel_saved', currentPeriod.start, currentPeriod.end),
      this.sumMetricValue('fuel_saved', previousPeriod.start, previousPeriod.end),
      this.sumMetricValue('distance_saved', currentPeriod.start, currentPeriod.end),
      this.sumMetricValue('distance_saved', previousPeriod.start, previousPeriod.end),
      this.calculateTimeSaved(currentPeriod.start, currentPeriod.end),
      this.calculateTimeSaved(previousPeriod.start, previousPeriod.end),
      this.calculateSLAAdherenceRate(currentPeriod.start, currentPeriod.end),
      this.calculateSLAAdherenceRate(previousPeriod.start, previousPeriod.end)
    ]);

    return {
      fuelSavings: this.createMetricWithTrend(
        fuelSavingsCurrent,
        fuelSavingsPrevious,
        'liters',
        1000 // target
      ),
      distanceSaved: this.createMetricWithTrend(
        distanceSavedCurrent,
        distanceSavedPrevious,
        'km',
        5000 // target
      ),
      timeSaved: this.createMetricWithTrend(
        timeSavedCurrent,
        timeSavedPrevious,
        'hours',
        200 // target
      ),
      slaAdherence: this.createMetricWithTrend(
        slaAdherenceCurrent,
        slaAdherencePrevious,
        'percentage',
        95 // target 95%
      ),
      customerSatisfaction: this.createMetricWithTrend(
        85, // placeholder - would come from customer feedback
        82,
        'score',
        90 // target
      )
    };
  }

  /**
   * Calculate environmental impact metrics with trends
   */
  private async calculateEnvironmentalImpactMetrics(timeRange: TimeRange): Promise<EnvironmentalImpactMetrics> {
    const currentPeriod = timeRange;
    const previousPeriod = this.getPreviousPeriod(timeRange);

    const [
      co2SavedCurrent,
      co2SavedPrevious,
      fuelReductionCurrent,
      fuelReductionPrevious
    ] = await Promise.all([
      this.sumMetricValue('co2_emissions_saved', currentPeriod.start, currentPeriod.end),
      this.sumMetricValue('co2_emissions_saved', previousPeriod.start, previousPeriod.end),
      this.sumMetricValue('fuel_saved', currentPeriod.start, currentPeriod.end),
      this.sumMetricValue('fuel_saved', previousPeriod.start, previousPeriod.end)
    ]);

    // Calculate carbon footprint reduction percentage
    const carbonFootprintReductionCurrent = this.calculateCarbonFootprintReduction(co2SavedCurrent);
    const carbonFootprintReductionPrevious = this.calculateCarbonFootprintReduction(co2SavedPrevious);

    // Calculate sustainability score (composite metric)
    const sustainabilityScoreCurrent = this.calculateSustainabilityScore(
      co2SavedCurrent,
      fuelReductionCurrent,
      timeRange
    );
    const sustainabilityScorePrevious = this.calculateSustainabilityScore(
      co2SavedPrevious,
      fuelReductionPrevious,
      previousPeriod
    );

    return {
      co2EmissionsSaved: this.createMetricWithTrend(
        co2SavedCurrent,
        co2SavedPrevious,
        'kg',
        2000 // target
      ),
      fuelConsumptionReduction: this.createMetricWithTrend(
        fuelReductionCurrent,
        fuelReductionPrevious,
        'liters',
        1000 // target
      ),
      carbonFootprintReduction: this.createMetricWithTrend(
        carbonFootprintReductionCurrent,
        carbonFootprintReductionPrevious,
        'percentage',
        15 // target 15% reduction
      ),
      sustainabilityScore: this.createMetricWithTrend(
        sustainabilityScoreCurrent,
        sustainabilityScorePrevious,
        'score',
        85 // target
      )
    };
  }

  /**
   * Calculate operational efficiency metrics with trends
   */
  private async calculateOperationalEfficiencyMetrics(timeRange: TimeRange): Promise<OperationalEfficiencyMetrics> {
    const currentPeriod = timeRange;
    const previousPeriod = this.getPreviousPeriod(timeRange);

    const [
      decisionAccuracyCurrent,
      decisionAccuracyPrevious,
      processingTimeCurrent,
      processingTimePrevious,
      overrideRateCurrent,
      overrideRatePrevious
    ] = await Promise.all([
      this.calculateDecisionAccuracy(currentPeriod.start, currentPeriod.end),
      this.calculateDecisionAccuracy(previousPeriod.start, previousPeriod.end),
      this.averageMetricValue('decision_processing_time', currentPeriod.start, currentPeriod.end),
      this.averageMetricValue('decision_processing_time', previousPeriod.start, previousPeriod.end),
      this.calculateManualOverrideRate(currentPeriod.start, currentPeriod.end),
      this.calculateManualOverrideRate(previousPeriod.start, previousPeriod.end)
    ]);

    return {
      decisionAccuracy: this.createMetricWithTrend(
        decisionAccuracyCurrent,
        decisionAccuracyPrevious,
        'percentage',
        95 // target 95%
      ),
      processingTime: this.createMetricWithTrend(
        processingTimeCurrent,
        processingTimePrevious,
        'ms',
        500 // target 500ms
      ),
      systemUptime: this.createMetricWithTrend(
        99.8, // placeholder - would come from monitoring
        99.5,
        'percentage',
        99.9 // target 99.9%
      ),
      errorRate: this.createMetricWithTrend(
        0.2, // placeholder - would come from error tracking
        0.3,
        'percentage',
        0.1 // target 0.1%
      ),
      overrideRate: this.createMetricWithTrend(
        overrideRateCurrent,
        overrideRatePrevious,
        'percentage',
        5 // target max 5%
      )
    };
  }

  /**
   * Calculate financial impact metrics with trends
   */
  private async calculateFinancialImpactMetrics(timeRange: TimeRange): Promise<FinancialImpactMetrics> {
    const currentPeriod = timeRange;
    const previousPeriod = this.getPreviousPeriod(timeRange);

    // Calculate cost savings from fuel and vehicle reduction
    const fuelSavingsCurrent = await this.sumMetricValue('fuel_saved', currentPeriod.start, currentPeriod.end);
    const fuelSavingsPrevious = await this.sumMetricValue('fuel_saved', previousPeriod.start, previousPeriod.end);
    const vehiclesAvoidedCurrent = await this.sumMetricValue('vehicles_avoided', currentPeriod.start, currentPeriod.end);
    const vehiclesAvoidedPrevious = await this.sumMetricValue('vehicles_avoided', previousPeriod.start, previousPeriod.end);

    // Estimate costs (these would typically come from financial systems)
    const fuelCostPerLiter = 1.2; // $1.2 per liter
    const vehicleOperationalCostPerDay = 50; // $50 per vehicle per day

    const costSavingsCurrent = (fuelSavingsCurrent * fuelCostPerLiter) + 
                              (vehiclesAvoidedCurrent * vehicleOperationalCostPerDay);
    const costSavingsPrevious = (fuelSavingsPrevious * fuelCostPerLiter) + 
                               (vehiclesAvoidedPrevious * vehicleOperationalCostPerDay);

    // Calculate ROI (placeholder calculation)
    const systemCost = 10000; // monthly system cost
    const roiCurrent = (costSavingsCurrent / systemCost) * 100;
    const roiPrevious = (costSavingsPrevious / systemCost) * 100;

    return {
      costSavings: this.createMetricWithTrend(
        costSavingsCurrent,
        costSavingsPrevious,
        'USD',
        15000 // target
      ),
      revenueImpact: this.createMetricWithTrend(
        costSavingsCurrent * 1.2, // assume 20% revenue impact
        costSavingsPrevious * 1.2,
        'USD',
        18000 // target
      ),
      roi: this.createMetricWithTrend(
        roiCurrent,
        roiPrevious,
        'percentage',
        150 // target 150% ROI
      ),
      operationalCostReduction: this.createMetricWithTrend(
        (costSavingsCurrent / (systemCost + costSavingsCurrent)) * 100,
        (costSavingsPrevious / (systemCost + costSavingsPrevious)) * 100,
        'percentage',
        20 // target 20% reduction
      )
    };
  }

  /**
   * Generate trend analysis data
   */
  private async generateTrendAnalysis(timeRange: TimeRange): Promise<TrendAnalysisData> {
    // This is a simplified implementation - in practice, this would involve
    // sophisticated time series analysis, seasonality detection, and forecasting
    
    const dataPoints = await this.getTrendDataPoints(timeRange);
    
    return {
      timeRange,
      dataPoints,
      seasonality: {
        dailyPatterns: [],
        weeklyPatterns: [],
        monthlyPatterns: [],
        identifiedSeasons: []
      },
      forecasting: {
        method: 'linear_regression' as any,
        predictions: [],
        confidence: 0.85,
        accuracy: 0.92
      },
      anomalies: []
    };
  }

  /**
   * Generate benchmarking data
   */
  private async generateBenchmarkingData(timeRange: TimeRange): Promise<BenchmarkingData> {
    // This would typically compare against industry standards and historical data
    // For now, we'll provide placeholder benchmarking data
    
    return {
      industryBenchmarks: [
        {
          metricName: 'consolidation_rate',
          ourValue: 65,
          industryAverage: 45,
          industryBest: 80,
          percentile: 75,
          status: 'above_average' as any
        },
        {
          metricName: 'vehicle_utilization',
          ourValue: 82,
          industryAverage: 70,
          industryBest: 90,
          percentile: 80,
          status: 'above_average' as any
        }
      ],
      historicalComparison: [],
      peerComparison: [],
      targetVsActual: []
    };
  }

  /**
   * Calculate custom KPIs
   */
  private async calculateCustomKPIs(timeRange: TimeRange): Promise<CustomKPIData[]> {
    const customKPIs = await this.customKPIRepository.find({
      where: { isActive: true }
    });

    const results: CustomKPIData[] = [];

    for (const kpi of customKPIs) {
      try {
        const value = await this.evaluateKPIFormula(kpi.formula, timeRange);
        const previousValue = await this.evaluateKPIFormula(
          kpi.formula, 
          this.getPreviousPeriod(timeRange)
        );

        const trend = this.calculateTrend(value, previousValue);
        const trendPercentage = this.calculateTrendPercentage(value, previousValue);

        results.push({
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          formula: kpi.formula,
          value,
          unit: kpi.unit,
          target: kpi.target,
          trend,
          trendPercentage,
          category: kpi.category,
          owner: kpi.owner,
          lastUpdated: new Date()
        });

        // Update the KPI entity with the calculated value
        await this.customKPIRepository.update(kpi.id, {
          lastCalculatedValue: value,
          lastCalculatedAt: new Date()
        });

      } catch (error) {
        this.logger.error(`Error calculating custom KPI ${kpi.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Helper method to create MetricWithTrend
   */
  private createMetricWithTrend(
    current: number,
    previous: number,
    unit: string,
    target?: number
  ): MetricWithTrend {
    const trend = this.calculateTrend(current, previous);
    const trendPercentage = this.calculateTrendPercentage(current, previous);
    const status = this.calculateMetricStatus(current, target, trend);

    return {
      current,
      previous,
      trend,
      trendPercentage,
      unit,
      target,
      status
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(current: number, previous: number): TrendDirection {
    if (previous === 0) return TrendDirection.STABLE;
    
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 2) return TrendDirection.STABLE;
    if (change > 15) return TrendDirection.VOLATILE;
    if (change < -15) return TrendDirection.VOLATILE;
    
    return change > 0 ? TrendDirection.UP : TrendDirection.DOWN;
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrendPercentage(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  /**
   * Calculate metric status
   */
  private calculateMetricStatus(
    current: number, 
    target?: number, 
    trend?: TrendDirection
  ): MetricStatus {
    if (!target) return MetricStatus.GOOD;
    
    const achievement = (current / target) * 100;
    
    if (achievement >= 100) return MetricStatus.EXCELLENT;
    if (achievement >= 80) return MetricStatus.GOOD;
    if (achievement >= 60) return MetricStatus.WARNING;
    return MetricStatus.CRITICAL;
  }

  /**
   * Get previous period for comparison
   */
  private getPreviousPeriod(timeRange: TimeRange): TimeRange {
    const duration = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      start: new Date(timeRange.start.getTime() - duration),
      end: new Date(timeRange.end.getTime() - duration),
      granularity: timeRange.granularity
    };
  }

  // Helper methods for metric calculations
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

  private async calculateConsolidationRate(startDate: Date, endDate: Date): Promise<number> {
    const vehiclesAvoided = await this.sumMetricValue('vehicles_avoided', startDate, endDate);
    const totalParcels = await this.countUniqueParcelIds(startDate, endDate);
    
    return totalParcels > 0 ? (vehiclesAvoided / totalParcels) * 100 : 0;
  }

  private async countConsolidatedParcels(startDate: Date, endDate: Date): Promise<number> {
    return this.countUniqueParcelIds(startDate, endDate);
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

  private async calculateTimeSaved(startDate: Date, endDate: Date): Promise<number> {
    // Estimate time saved based on distance saved (assuming 30 km/h average speed)
    const distanceSaved = await this.sumMetricValue('distance_saved', startDate, endDate);
    return distanceSaved / 30; // hours
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

  private calculateCarbonFootprintReduction(co2Saved: number): number {
    // Estimate based on typical fleet emissions
    const typicalFleetEmissions = 1000; // kg CO2 per period
    return (co2Saved / typicalFleetEmissions) * 100;
  }

  private calculateSustainabilityScore(
    co2Saved: number, 
    fuelSaved: number, 
    timeRange: TimeRange
  ): number {
    // Composite sustainability score (0-100)
    const co2Score = Math.min((co2Saved / 2000) * 50, 50); // max 50 points
    const fuelScore = Math.min((fuelSaved / 1000) * 30, 30); // max 30 points
    const efficiencyScore = 20; // placeholder for efficiency metrics
    
    return Math.round(co2Score + fuelScore + efficiencyScore);
  }

  private async calculateDecisionAccuracy(startDate: Date, endDate: Date): Promise<number> {
    // This would typically compare shadow mode predictions with actual outcomes
    // For now, return a placeholder value
    return 92.5;
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

  private async getTrendDataPoints(timeRange: TimeRange): Promise<any[]> {
    // This would generate time series data points for trend analysis
    // For now, return empty array as placeholder
    return [];
  }

  private async evaluateKPIFormula(formula: string, timeRange: TimeRange): Promise<number> {
    // This would parse and evaluate custom KPI formulas
    // For now, return a placeholder value
    return Math.random() * 100;
  }
}