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
var ReportingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const analytics_metric_entity_1 = require("../entities/analytics-metric.entity");
const daily_metrics_summary_entity_1 = require("../entities/daily-metrics-summary.entity");
const metrics_calculator_service_1 = require("./metrics-calculator.service");
let ReportingService = ReportingService_1 = class ReportingService {
    metricsRepository;
    dailySummaryRepository;
    metricsCalculatorService;
    logger = new common_1.Logger(ReportingService_1.name);
    // Cost factors for savings calculations
    COST_FACTORS = {
        fuelCostPerLiter: 100, // INR per liter
        driverCostPerHour: 150, // INR per hour
        vehicleOperatingCostPerKm: 8, // INR per km
    };
    constructor(metricsRepository, dailySummaryRepository, metricsCalculatorService) {
        this.metricsRepository = metricsRepository;
        this.dailySummaryRepository = dailySummaryRepository;
        this.metricsCalculatorService = metricsCalculatorService;
    }
    /**
     * Generate comprehensive analytics report
     */
    async generateAnalyticsReport(startDate, endDate) {
        const summaries = await this.metricsCalculatorService.getDailySummaries(startDate, endDate);
        if (summaries.length === 0) {
            return this.getEmptyReport(startDate, endDate);
        }
        // Calculate aggregated metrics
        const totalVehiclesAvoided = summaries.reduce((sum, s) => sum + s.vehiclesAvoided, 0);
        const totalParcelsProcessed = summaries.reduce((sum, s) => sum + s.totalParcelsProcessed, 0);
        const avgConsolidationRate = summaries.reduce((sum, s) => sum + s.consolidationRate, 0) / summaries.length;
        const avgVehicleUtilization = summaries.reduce((sum, s) => sum + s.avgVehicleUtilization, 0) / summaries.length;
        const totalDistanceSaved = summaries.reduce((sum, s) => sum + s.totalDistanceSaved, 0);
        const totalFuelSaved = summaries.reduce((sum, s) => sum + s.totalFuelSaved, 0);
        const totalCo2Saved = summaries.reduce((sum, s) => sum + s.co2EmissionsSaved, 0);
        const emissionsPerParcel = totalParcelsProcessed > 0 ? totalCo2Saved / totalParcelsProcessed : 0;
        const avgSlaAdherence = summaries.reduce((sum, s) => sum + s.slaAdherenceRate, 0) / summaries.length;
        const avgDeliveryTime = summaries.reduce((sum, s) => sum + s.avgDeliveryTime, 0) / summaries.length;
        const avgDecisionTime = summaries.reduce((sum, s) => sum + s.avgDecisionTime, 0) / summaries.length;
        const avgManualOverrideRate = summaries.reduce((sum, s) => sum + s.manualOverrideRate, 0) / summaries.length;
        // Calculate trends (comparing first half vs second half of period)
        const midPoint = Math.floor(summaries.length / 2);
        const firstHalf = summaries.slice(0, midPoint);
        const secondHalf = summaries.slice(midPoint);
        const trends = this.calculateTrends(firstHalf, secondHalf);
        return {
            period: { start: startDate, end: endDate },
            primaryMetrics: {
                vehiclesAvoided: totalVehiclesAvoided,
                totalParcelsProcessed,
                consolidationRate: Math.round(avgConsolidationRate * 100) / 100,
            },
            utilizationMetrics: {
                avgVehicleUtilization: Math.round(avgVehicleUtilization * 100) / 100,
                totalDistanceSaved: Math.round(totalDistanceSaved * 100) / 100,
                totalFuelSaved: Math.round(totalFuelSaved * 100) / 100,
            },
            environmentalImpact: {
                co2EmissionsSaved: Math.round(totalCo2Saved * 100) / 100,
                emissionsPerParcel: Math.round(emissionsPerParcel * 100) / 100,
            },
            slaMetrics: {
                adherenceRate: Math.round(avgSlaAdherence * 100) / 100,
                avgDeliveryTime: Math.round(avgDeliveryTime * 100) / 100,
                riskEvents: await this.countSLARiskEvents(startDate, endDate),
            },
            decisionEngineMetrics: {
                avgDecisionTime: Math.round(avgDecisionTime * 100) / 100,
                shadowModeAccuracy: 0, // TODO: Implement shadow mode accuracy calculation
                manualOverrideRate: Math.round(avgManualOverrideRate * 100) / 100,
            },
            trends,
        };
    }
    /**
     * Generate impact report with trend analysis
     */
    async generateImpactReport(request) {
        const { startDate, endDate, includeComparisons = false, comparisonPeriodDays = 30 } = request;
        const summaries = await this.metricsCalculatorService.getDailySummaries(startDate, endDate);
        // Calculate summary metrics
        const totalConsolidations = summaries.reduce((sum, s) => sum + s.successfulConsolidations, 0);
        const vehiclesAvoided = summaries.reduce((sum, s) => sum + s.vehiclesAvoided, 0);
        const distanceSaved = summaries.reduce((sum, s) => sum + s.totalDistanceSaved, 0);
        const fuelSaved = summaries.reduce((sum, s) => sum + s.totalFuelSaved, 0);
        const co2Saved = summaries.reduce((sum, s) => sum + s.co2EmissionsSaved, 0);
        // Calculate cost savings
        const costSavings = this.calculateCostSavings(fuelSaved, distanceSaved, vehiclesAvoided);
        // Calculate trends
        const midPoint = Math.floor(summaries.length / 2);
        const firstHalf = summaries.slice(0, midPoint);
        const secondHalf = summaries.slice(midPoint);
        const trends = this.calculateDetailedTrends(firstHalf, secondHalf);
        // Get breakdown data
        const breakdown = await this.getBreakdownData(startDate, endDate);
        const report = {
            period: { start: startDate, end: endDate },
            summary: {
                totalConsolidations,
                vehiclesAvoided,
                distanceSaved: Math.round(distanceSaved * 100) / 100,
                fuelSaved: Math.round(fuelSaved * 100) / 100,
                co2Saved: Math.round(co2Saved * 100) / 100,
                costSavings: Math.round(costSavings * 100) / 100,
            },
            trends,
            breakdown,
        };
        // Add comparisons if requested
        if (includeComparisons) {
            const comparisonStartDate = new Date(startDate);
            comparisonStartDate.setDate(comparisonStartDate.getDate() - comparisonPeriodDays);
            const comparisonEndDate = new Date(startDate);
            const comparisonSummaries = await this.metricsCalculatorService.getDailySummaries(comparisonStartDate, comparisonEndDate);
            if (comparisonSummaries.length > 0) {
                const comparisonData = this.calculateComparisonData(summaries, comparisonSummaries);
                report.comparisons = comparisonData;
            }
        }
        return report;
    }
    /**
     * Define and store custom metric definitions
     */
    async defineCustomMetric(definition) {
        // Store custom metric definition in database or configuration
        // This is a simplified implementation - in production, you'd want to store these properly
        this.logger.log(`Custom metric defined: ${definition.name}`);
        // Validate formula syntax
        this.validateCustomMetricFormula(definition.formula);
        // TODO: Store in database table for custom metric definitions
    }
    /**
     * Calculate custom metric value based on definition
     */
    async calculateCustomMetric(metricName, startDate, endDate) {
        // This is a simplified implementation
        // In production, you'd retrieve the metric definition and evaluate the formula
        switch (metricName) {
            case 'efficiency_score':
                return this.calculateEfficiencyScore(startDate, endDate);
            case 'environmental_impact_score':
                return this.calculateEnvironmentalImpactScore(startDate, endDate);
            case 'cost_effectiveness_ratio':
                return this.calculateCostEffectivenessRatio(startDate, endDate);
            default:
                throw new Error(`Unknown custom metric: ${metricName}`);
        }
    }
    getEmptyReport(startDate, endDate) {
        return {
            period: { start: startDate, end: endDate },
            primaryMetrics: { vehiclesAvoided: 0, totalParcelsProcessed: 0, consolidationRate: 0 },
            utilizationMetrics: { avgVehicleUtilization: 0, totalDistanceSaved: 0, totalFuelSaved: 0 },
            environmentalImpact: { co2EmissionsSaved: 0, emissionsPerParcel: 0 },
            slaMetrics: { adherenceRate: 0, avgDeliveryTime: 0, riskEvents: 0 },
            decisionEngineMetrics: { avgDecisionTime: 0, shadowModeAccuracy: 0, manualOverrideRate: 0 },
            trends: { consolidationRateTrend: 0, utilizationTrend: 0, slaAdherenceTrend: 0 },
        };
    }
    calculateTrends(firstHalf, secondHalf) {
        if (firstHalf.length === 0 || secondHalf.length === 0) {
            return { consolidationRateTrend: 0, utilizationTrend: 0, slaAdherenceTrend: 0 };
        }
        const firstHalfAvg = {
            consolidationRate: firstHalf.reduce((sum, s) => sum + s.consolidationRate, 0) / firstHalf.length,
            utilization: firstHalf.reduce((sum, s) => sum + s.avgVehicleUtilization, 0) / firstHalf.length,
            slaAdherence: firstHalf.reduce((sum, s) => sum + s.slaAdherenceRate, 0) / firstHalf.length,
        };
        const secondHalfAvg = {
            consolidationRate: secondHalf.reduce((sum, s) => sum + s.consolidationRate, 0) / secondHalf.length,
            utilization: secondHalf.reduce((sum, s) => sum + s.avgVehicleUtilization, 0) / secondHalf.length,
            slaAdherence: secondHalf.reduce((sum, s) => sum + s.slaAdherenceRate, 0) / secondHalf.length,
        };
        return {
            consolidationRateTrend: Math.round((secondHalfAvg.consolidationRate - firstHalfAvg.consolidationRate) * 100) / 100,
            utilizationTrend: Math.round((secondHalfAvg.utilization - firstHalfAvg.utilization) * 100) / 100,
            slaAdherenceTrend: Math.round((secondHalfAvg.slaAdherence - firstHalfAvg.slaAdherence) * 100) / 100,
        };
    }
    calculateDetailedTrends(firstHalf, secondHalf) {
        const basicTrends = this.calculateTrends(firstHalf, secondHalf);
        if (firstHalf.length === 0 || secondHalf.length === 0) {
            return { ...basicTrends, emissionsTrend: 0 };
        }
        const firstHalfEmissions = firstHalf.reduce((sum, s) => sum + s.co2EmissionsSaved, 0) / firstHalf.length;
        const secondHalfEmissions = secondHalf.reduce((sum, s) => sum + s.co2EmissionsSaved, 0) / secondHalf.length;
        return {
            ...basicTrends,
            emissionsTrend: Math.round((secondHalfEmissions - firstHalfEmissions) * 100) / 100,
        };
    }
    calculateCostSavings(fuelSaved, distanceSaved, vehiclesAvoided) {
        const fuelCostSavings = fuelSaved * this.COST_FACTORS.fuelCostPerLiter;
        const operatingCostSavings = distanceSaved * this.COST_FACTORS.vehicleOperatingCostPerKm;
        const driverCostSavings = vehiclesAvoided * 8 * this.COST_FACTORS.driverCostPerHour; // Assuming 8-hour shifts
        return fuelCostSavings + operatingCostSavings + driverCostSavings;
    }
    async getBreakdownData(startDate, endDate) {
        // Get breakdown by vehicle type from metrics
        const vehicleTypeBreakdown = await this.metricsRepository
            .createQueryBuilder('metric')
            .select('metric.dimensions ->> \'vehicleType\'', 'vehicleType')
            .addSelect('COUNT(*)', 'count')
            .where('metric.metricName = :metricName', { metricName: 'vehicles_avoided' })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('metric.dimensions ? \'vehicleType\'')
            .groupBy('metric.dimensions ->> \'vehicleType\'')
            .getRawMany();
        const byVehicleType = vehicleTypeBreakdown.reduce((acc, row) => {
            acc[row.vehicleType] = parseInt(row.count);
            return acc;
        }, {});
        // Get breakdown by time of day (simplified - would need more complex query in production)
        const byTimeOfDay = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            consolidations: Math.floor(Math.random() * 10), // Placeholder data
        }));
        // Get breakdown by day of week (simplified)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const byDayOfWeek = dayNames.map(day => ({
            day,
            consolidations: Math.floor(Math.random() * 20), // Placeholder data
        }));
        return {
            byVehicleType,
            byTimeOfDay,
            byDayOfWeek,
        };
    }
    calculateComparisonData(currentSummaries, previousSummaries) {
        const currentAvg = {
            consolidationRate: currentSummaries.reduce((sum, s) => sum + s.consolidationRate, 0) / currentSummaries.length,
            utilization: currentSummaries.reduce((sum, s) => sum + s.avgVehicleUtilization, 0) / currentSummaries.length,
            emissions: currentSummaries.reduce((sum, s) => sum + s.co2EmissionsSaved, 0) / currentSummaries.length,
        };
        const previousAvg = {
            consolidationRate: previousSummaries.reduce((sum, s) => sum + s.consolidationRate, 0) / previousSummaries.length,
            utilization: previousSummaries.reduce((sum, s) => sum + s.avgVehicleUtilization, 0) / previousSummaries.length,
            emissions: previousSummaries.reduce((sum, s) => sum + s.co2EmissionsSaved, 0) / previousSummaries.length,
        };
        return {
            previousPeriod: {
                start: previousSummaries[0]?.date || new Date(),
                end: previousSummaries[previousSummaries.length - 1]?.date || new Date(),
                summary: previousAvg,
            },
            improvements: {
                consolidationRateChange: Math.round((currentAvg.consolidationRate - previousAvg.consolidationRate) * 100) / 100,
                utilizationChange: Math.round((currentAvg.utilization - previousAvg.utilization) * 100) / 100,
                emissionsReductionChange: Math.round((currentAvg.emissions - previousAvg.emissions) * 100) / 100,
            },
        };
    }
    async countSLARiskEvents(startDate, endDate) {
        const result = await this.metricsRepository
            .createQueryBuilder('metric')
            .where('metric.metricName = :metricName', { metricName: 'sla_adherence' })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('metric.dimensions ->> \'status\' = :status', { status: 'at_risk' })
            .getCount();
        return result;
    }
    validateCustomMetricFormula(formula) {
        // Basic validation - in production, you'd want more sophisticated parsing
        const allowedOperators = ['+', '-', '*', '/', '(', ')', 'SUM', 'AVG', 'COUNT'];
        const allowedMetrics = ['vehicles_avoided', 'distance_saved', 'fuel_saved', 'co2_emissions_saved'];
        // Simple validation - check for dangerous patterns
        if (formula.includes('DROP') || formula.includes('DELETE') || formula.includes('UPDATE')) {
            throw new Error('Invalid formula: contains dangerous SQL keywords');
        }
        this.logger.debug(`Custom metric formula validated: ${formula}`);
    }
    async calculateEfficiencyScore(startDate, endDate) {
        const summaries = await this.metricsCalculatorService.getDailySummaries(startDate, endDate);
        if (summaries.length === 0)
            return 0;
        const avgConsolidationRate = summaries.reduce((sum, s) => sum + s.consolidationRate, 0) / summaries.length;
        const avgUtilization = summaries.reduce((sum, s) => sum + s.avgVehicleUtilization, 0) / summaries.length;
        const avgSlaAdherence = summaries.reduce((sum, s) => sum + s.slaAdherenceRate, 0) / summaries.length;
        // Weighted efficiency score
        return Math.round((avgConsolidationRate * 0.4 + avgUtilization * 0.4 + avgSlaAdherence * 0.2) * 100) / 100;
    }
    async calculateEnvironmentalImpactScore(startDate, endDate) {
        const summaries = await this.metricsCalculatorService.getDailySummaries(startDate, endDate);
        if (summaries.length === 0)
            return 0;
        const totalCo2Saved = summaries.reduce((sum, s) => sum + s.co2EmissionsSaved, 0);
        const totalParcels = summaries.reduce((sum, s) => sum + s.totalParcelsProcessed, 0);
        // Environmental impact score based on CO2 saved per parcel
        return totalParcels > 0 ? Math.round((totalCo2Saved / totalParcels) * 100) / 100 : 0;
    }
    async calculateCostEffectivenessRatio(startDate, endDate) {
        const summaries = await this.metricsCalculatorService.getDailySummaries(startDate, endDate);
        if (summaries.length === 0)
            return 0;
        const totalFuelSaved = summaries.reduce((sum, s) => sum + s.totalFuelSaved, 0);
        const totalDistanceSaved = summaries.reduce((sum, s) => sum + s.totalDistanceSaved, 0);
        const totalVehiclesAvoided = summaries.reduce((sum, s) => sum + s.vehiclesAvoided, 0);
        const costSavings = this.calculateCostSavings(totalFuelSaved, totalDistanceSaved, totalVehiclesAvoided);
        const totalParcels = summaries.reduce((sum, s) => sum + s.totalParcelsProcessed, 0);
        // Cost effectiveness ratio (savings per parcel)
        return totalParcels > 0 ? Math.round((costSavings / totalParcels) * 100) / 100 : 0;
    }
};
exports.ReportingService = ReportingService;
exports.ReportingService = ReportingService = ReportingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analytics_metric_entity_1.AnalyticsMetricEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(daily_metrics_summary_entity_1.DailyMetricsSummaryEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        metrics_calculator_service_1.MetricsCalculatorService])
], ReportingService);
//# sourceMappingURL=reporting.service.js.map