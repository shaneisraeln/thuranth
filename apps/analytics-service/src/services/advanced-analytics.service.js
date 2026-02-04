"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdvancedAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const advanced_analytics_interfaces_1 = require("../interfaces/advanced-analytics.interfaces");
const analytics_metric_entity_1 = require("../entities/analytics-metric.entity");
const daily_metrics_summary_entity_1 = require("../entities/daily-metrics-summary.entity");
const custom_kpi_entity_1 = require("../entities/custom-kpi.entity");
const metrics_calculator_service_1 = require("./metrics-calculator.service");
let AdvancedAnalyticsService = AdvancedAnalyticsService_1 = class AdvancedAnalyticsService {
    metricsRepository;
    dailySummaryRepository;
    customKPIRepository;
    metricsCalculator;
    logger = new common_1.Logger(AdvancedAnalyticsService_1.name);
    constructor(metricsRepository, dailySummaryRepository, customKPIRepository, metricsCalculator) {
        this.metricsRepository = metricsRepository;
        this.dailySummaryRepository = dailySummaryRepository;
        this.customKPIRepository = customKPIRepository;
        this.metricsCalculator = metricsCalculator;
    }
    /**
     * Generate comprehensive impact measurement dashboard
     */
    async generateImpactMeasurementDashboard(timeRange) {
        this.logger.log(`Generating impact measurement dashboard for ${timeRange.start} to ${timeRange.end}`);
        try {
            const [primaryMetrics, secondaryMetrics, environmentalImpact, operationalEfficiency, financialImpact, trendAnalysis, benchmarking, customKPIs] = await Promise.all([
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
        }
        catch (error) {
            this.logger.error('Error generating impact measurement dashboard:', error);
            throw error;
        }
    }
    /**
     * Calculate primary impact metrics with trends
     */
    async calculatePrimaryImpactMetrics(timeRange) {
        const currentPeriod = timeRange;
        const previousPeriod = this.getPreviousPeriod(timeRange);
        const [vehiclesAvoidedCurrent, vehiclesAvoidedPrevious, consolidationRateCurrent, consolidationRatePrevious, utilizationCurrent, utilizationPrevious, parcelsConsolidatedCurrent, parcelsConsolidatedPrevious] = await Promise.all([
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
            vehiclesAvoided: this.createMetricWithTrend(vehiclesAvoidedCurrent, vehiclesAvoidedPrevious, 'count', 100 // target
            ),
            consolidationRate: this.createMetricWithTrend(consolidationRateCurrent, consolidationRatePrevious, 'percentage', 75 // target 75%
            ),
            utilizationImprovement: this.createMetricWithTrend(utilizationCurrent, utilizationPrevious, 'percentage', 85 // target 85%
            ),
            parcelsConsolidated: this.createMetricWithTrend(parcelsConsolidatedCurrent, parcelsConsolidatedPrevious, 'count', 500 // target
            )
        };
    }
    /**
     * Calculate secondary impact metrics with trends
     */
    async calculateSecondaryImpactMetrics(timeRange) {
        const currentPeriod = timeRange;
        const previousPeriod = this.getPreviousPeriod(timeRange);
        const [fuelSavingsCurrent, fuelSavingsPrevious, distanceSavedCurrent, distanceSavedPrevious, timeSavedCurrent, timeSavedPrevious, slaAdherenceCurrent, slaAdherencePrevious] = await Promise.all([
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
            fuelSavings: this.createMetricWithTrend(fuelSavingsCurrent, fuelSavingsPrevious, 'liters', 1000 // target
            ),
            distanceSaved: this.createMetricWithTrend(distanceSavedCurrent, distanceSavedPrevious, 'km', 5000 // target
            ),
            timeSaved: this.createMetricWithTrend(timeSavedCurrent, timeSavedPrevious, 'hours', 200 // target
            ),
            slaAdherence: this.createMetricWithTrend(slaAdherenceCurrent, slaAdherencePrevious, 'percentage', 95 // target 95%
            ),
            customerSatisfaction: this.createMetricWithTrend(85, // placeholder - would come from customer feedback
            82, 'score', 90 // target
            )
        };
    }
    /**
     * Calculate environmental impact metrics with trends
     */
    async calculateEnvironmentalImpactMetrics(timeRange) {
        const currentPeriod = timeRange;
        const previousPeriod = this.getPreviousPeriod(timeRange);
        const [co2SavedCurrent, co2SavedPrevious, fuelReductionCurrent, fuelReductionPrevious] = await Promise.all([
            this.sumMetricValue('co2_emissions_saved', currentPeriod.start, currentPeriod.end),
            this.sumMetricValue('co2_emissions_saved', previousPeriod.start, previousPeriod.end),
            this.sumMetricValue('fuel_saved', currentPeriod.start, currentPeriod.end),
            this.sumMetricValue('fuel_saved', previousPeriod.start, previousPeriod.end)
        ]);
        // Calculate carbon footprint reduction percentage
        const carbonFootprintReductionCurrent = this.calculateCarbonFootprintReduction(co2SavedCurrent);
        const carbonFootprintReductionPrevious = this.calculateCarbonFootprintReduction(co2SavedPrevious);
        // Calculate sustainability score (composite metric)
        const sustainabilityScoreCurrent = this.calculateSustainabilityScore(co2SavedCurrent, fuelReductionCurrent, timeRange);
        const sustainabilityScorePrevious = this.calculateSustainabilityScore(co2SavedPrevious, fuelReductionPrevious, previousPeriod);
        return {
            co2EmissionsSaved: this.createMetricWithTrend(co2SavedCurrent, co2SavedPrevious, 'kg', 2000 // target
            ),
            fuelConsumptionReduction: this.createMetricWithTrend(fuelReductionCurrent, fuelReductionPrevious, 'liters', 1000 // target
            ),
            carbonFootprintReduction: this.createMetricWithTrend(carbonFootprintReductionCurrent, carbonFootprintReductionPrevious, 'percentage', 15 // target 15% reduction
            ),
            sustainabilityScore: this.createMetricWithTrend(sustainabilityScoreCurrent, sustainabilityScorePrevious, 'score', 85 // target
            )
        };
    }
    /**
     * Calculate operational efficiency metrics with trends
     */
    async calculateOperationalEfficiencyMetrics(timeRange) {
        const currentPeriod = timeRange;
        const previousPeriod = this.getPreviousPeriod(timeRange);
        const [decisionAccuracyCurrent, decisionAccuracyPrevious, processingTimeCurrent, processingTimePrevious, overrideRateCurrent, overrideRatePrevious] = await Promise.all([
            this.calculateDecisionAccuracy(currentPeriod.start, currentPeriod.end),
            this.calculateDecisionAccuracy(previousPeriod.start, previousPeriod.end),
            this.averageMetricValue('decision_processing_time', currentPeriod.start, currentPeriod.end),
            this.averageMetricValue('decision_processing_time', previousPeriod.start, previousPeriod.end),
            this.calculateManualOverrideRate(currentPeriod.start, currentPeriod.end),
            this.calculateManualOverrideRate(previousPeriod.start, previousPeriod.end)
        ]);
        return {
            decisionAccuracy: this.createMetricWithTrend(decisionAccuracyCurrent, decisionAccuracyPrevious, 'percentage', 95 // target 95%
            ),
            processingTime: this.createMetricWithTrend(processingTimeCurrent, processingTimePrevious, 'ms', 500 // target 500ms
            ),
            systemUptime: this.createMetricWithTrend(99.8, // placeholder - would come from monitoring
            99.5, 'percentage', 99.9 // target 99.9%
            ),
            errorRate: this.createMetricWithTrend(0.2, // placeholder - would come from error tracking
            0.3, 'percentage', 0.1 // target 0.1%
            ),
            overrideRate: this.createMetricWithTrend(overrideRateCurrent, overrideRatePrevious, 'percentage', 5 // target max 5%
            )
        };
    }
    /**
     * Calculate financial impact metrics with trends
     */
    async calculateFinancialImpactMetrics(timeRange) {
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
            costSavings: this.createMetricWithTrend(costSavingsCurrent, costSavingsPrevious, 'USD', 15000 // target
            ),
            revenueImpact: this.createMetricWithTrend(costSavingsCurrent * 1.2, // assume 20% revenue impact
            costSavingsPrevious * 1.2, 'USD', 18000 // target
            ),
            roi: this.createMetricWithTrend(roiCurrent, roiPrevious, 'percentage', 150 // target 150% ROI
            ),
            operationalCostReduction: this.createMetricWithTrend((costSavingsCurrent / (systemCost + costSavingsCurrent)) * 100, (costSavingsPrevious / (systemCost + costSavingsPrevious)) * 100, 'percentage', 20 // target 20% reduction
            )
        };
    }
    /**
     * Generate trend analysis data
     */
    async generateTrendAnalysis(timeRange) {
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
                method: 'linear_regression',
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
    async generateBenchmarkingData(timeRange) {
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
                    status: 'above_average'
                },
                {
                    metricName: 'vehicle_utilization',
                    ourValue: 82,
                    industryAverage: 70,
                    industryBest: 90,
                    percentile: 80,
                    status: 'above_average'
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
    async calculateCustomKPIs(timeRange) {
        const customKPIs = await this.customKPIRepository.find({
            where: { isActive: true }
        });
        const results = [];
        for (const kpi of customKPIs) {
            try {
                const value = await this.evaluateKPIFormula(kpi.formula, timeRange);
                const previousValue = await this.evaluateKPIFormula(kpi.formula, this.getPreviousPeriod(timeRange));
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
            }
            catch (error) {
                this.logger.error(`Error calculating custom KPI ${kpi.name}:`, error);
            }
        }
        return results;
    }
    /**
     * Helper method to create MetricWithTrend
     */
    createMetricWithTrend(current, previous, unit, target) {
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
    calculateTrend(current, previous) {
        if (previous === 0)
            return advanced_analytics_interfaces_1.TrendDirection.STABLE;
        const change = ((current - previous) / previous) * 100;
        if (Math.abs(change) < 2)
            return advanced_analytics_interfaces_1.TrendDirection.STABLE;
        if (change > 15)
            return advanced_analytics_interfaces_1.TrendDirection.VOLATILE;
        if (change < -15)
            return advanced_analytics_interfaces_1.TrendDirection.VOLATILE;
        return change > 0 ? advanced_analytics_interfaces_1.TrendDirection.UP : advanced_analytics_interfaces_1.TrendDirection.DOWN;
    }
    /**
     * Calculate trend percentage
     */
    calculateTrendPercentage(current, previous) {
        if (previous === 0)
            return 0;
        return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    }
    /**
     * Calculate metric status
     */
    calculateMetricStatus(current, target, trend) {
        if (!target)
            return advanced_analytics_interfaces_1.MetricStatus.GOOD;
        const achievement = (current / target) * 100;
        if (achievement >= 100)
            return advanced_analytics_interfaces_1.MetricStatus.EXCELLENT;
        if (achievement >= 80)
            return advanced_analytics_interfaces_1.MetricStatus.GOOD;
        if (achievement >= 60)
            return advanced_analytics_interfaces_1.MetricStatus.WARNING;
        return advanced_analytics_interfaces_1.MetricStatus.CRITICAL;
    }
    /**
     * Get previous period for comparison
     */
    getPreviousPeriod(timeRange) {
        const duration = timeRange.end.getTime() - timeRange.start.getTime();
        return {
            start: new Date(timeRange.start.getTime() - duration),
            end: new Date(timeRange.end.getTime() - duration),
            granularity: timeRange.granularity
        };
    }
    // Helper methods for metric calculations
    async sumMetricValue(metricName, startDate, endDate) {
        const result = await this.metricsRepository
            .createQueryBuilder('metric')
            .select('SUM(metric.value)', 'sum')
            .where('metric.metricName = :metricName', { metricName })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getRawOne();
        return parseFloat(result.sum) || 0;
    }
    async averageMetricValue(metricName, startDate, endDate) {
        const result = await this.metricsRepository
            .createQueryBuilder('metric')
            .select('AVG(metric.value)', 'avg')
            .where('metric.metricName = :metricName', { metricName })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getRawOne();
        return parseFloat(result.avg) || 0;
    }
    async calculateConsolidationRate(startDate, endDate) {
        const vehiclesAvoided = await this.sumMetricValue('vehicles_avoided', startDate, endDate);
        const totalParcels = await this.countUniqueParcelIds(startDate, endDate);
        return totalParcels > 0 ? (vehiclesAvoided / totalParcels) * 100 : 0;
    }
    async countConsolidatedParcels(startDate, endDate) {
        return this.countUniqueParcelIds(startDate, endDate);
    }
    async countUniqueParcelIds(startDate, endDate) {
        const result = await this.metricsRepository
            .createQueryBuilder('metric')
            .select('COUNT(DISTINCT metric.dimensions ->> \'parcelId\')', 'count')
            .where('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('metric.dimensions ? \'parcelId\'')
            .getRawOne();
        return parseInt(result.count) || 0;
    }
    async calculateTimeSaved(startDate, endDate) {
        // Estimate time saved based on distance saved (assuming 30 km/h average speed)
        const distanceSaved = await this.sumMetricValue('distance_saved', startDate, endDate);
        return distanceSaved / 30; // hours
    }
    async calculateSLAAdherenceRate(startDate, endDate) {
        const totalSLA = await this.metricsRepository
            .createQueryBuilder('metric')
            .where('metric.metricName = :metricName', { metricName: 'sla_adherence' })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getCount();
        const metSLA = await this.sumMetricValue('sla_adherence', startDate, endDate);
        return totalSLA > 0 ? (metSLA / totalSLA) * 100 : 0;
    }
    calculateCarbonFootprintReduction(co2Saved) {
        // Estimate based on typical fleet emissions
        const typicalFleetEmissions = 1000; // kg CO2 per period
        return (co2Saved / typicalFleetEmissions) * 100;
    }
    calculateSustainabilityScore(co2Saved, fuelSaved, timeRange) {
        // Composite sustainability score (0-100)
        const co2Score = Math.min((co2Saved / 2000) * 50, 50); // max 50 points
        const fuelScore = Math.min((fuelSaved / 1000) * 30, 30); // max 30 points
        const efficiencyScore = 20; // placeholder for efficiency metrics
        return Math.round(co2Score + fuelScore + efficiencyScore);
    }
    async calculateDecisionAccuracy(startDate, endDate) {
        // This would typically compare shadow mode predictions with actual outcomes
        // For now, return a placeholder value
        return 92.5;
    }
    async calculateManualOverrideRate(startDate, endDate) {
        const totalDecisions = await this.metricsRepository
            .createQueryBuilder('metric')
            .where('metric.metricName = :metricName', { metricName: 'decision_processing_time' })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getCount();
        const overrides = await this.sumMetricValue('manual_overrides', startDate, endDate);
        return totalDecisions > 0 ? (overrides / totalDecisions) * 100 : 0;
    }
    async getTrendDataPoints(timeRange) {
        // This would generate time series data points for trend analysis
        // For now, return empty array as placeholder
        return [];
    }
    async evaluateKPIFormula(formula, timeRange) {
        // This would parse and evaluate custom KPI formulas
        // For now, return a placeholder value
        return Math.random() * 100;
    }
};
exports.AdvancedAnalyticsService = AdvancedAnalyticsService;
exports.AdvancedAnalyticsService = AdvancedAnalyticsService = AdvancedAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analytics_metric_entity_1.AnalyticsMetricEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(daily_metrics_summary_entity_1.DailyMetricsSummaryEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(custom_kpi_entity_1.CustomKPIEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        metrics_calculator_service_1.MetricsCalculatorService])
], AdvancedAnalyticsService);
//# sourceMappingURL=advanced-analytics.service.js.map