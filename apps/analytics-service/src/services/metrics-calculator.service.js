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
var MetricsCalculatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const analytics_metric_entity_1 = require("../entities/analytics-metric.entity");
const daily_metrics_summary_entity_1 = require("../entities/daily-metrics-summary.entity");
let MetricsCalculatorService = MetricsCalculatorService_1 = class MetricsCalculatorService {
    metricsRepository;
    dailySummaryRepository;
    logger = new common_1.Logger(MetricsCalculatorService_1.name);
    // Emission factors (kg CO2 per liter of fuel)
    EMISSION_FACTORS = {
        petrol: 2.31, // kg CO2 per liter
        diesel: 2.68, // kg CO2 per liter
        electric: 0.5, // kg CO2 per kWh (grid average)
    };
    // Fuel consumption rates (liters per 100km)
    FUEL_CONSUMPTION = {
        '2W': { petrol: 2.5, diesel: 2.0 },
        '4W': { petrol: 8.0, diesel: 6.5 },
    };
    constructor(metricsRepository, dailySummaryRepository) {
        this.metricsRepository = metricsRepository;
        this.dailySummaryRepository = dailySummaryRepository;
    }
    /**
     * Record a consolidation event and calculate impact metrics
     */
    async recordConsolidationEvent(event) {
        const metrics = [
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
    async recordVehicleUtilization(data) {
        const metric = {
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
    async recordSLAPerformance(data) {
        const adherenceValue = data.adherenceStatus === 'met' ? 1 : 0;
        const deliveryTimeMinutes = (data.actualDeliveryTime.getTime() - data.slaDeadline.getTime()) / (1000 * 60);
        const metrics = [
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
    async recordDecisionPerformance(data) {
        const metrics = [
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
    calculateEmissions(params) {
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
    async recordMetric(request) {
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
    async getMetrics(filter) {
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
    async calculateDailySummary(date) {
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
    async getDailySummaries(startDate, endDate) {
        return this.dailySummaryRepository.find({
            where: {
                date: (0, typeorm_2.Between)(startDate, endDate),
            },
            order: {
                date: 'ASC',
            },
        });
    }
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
    async countUniqueParcelIds(startDate, endDate) {
        const result = await this.metricsRepository
            .createQueryBuilder('metric')
            .select('COUNT(DISTINCT metric.dimensions ->> \'parcelId\')', 'count')
            .where('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('metric.dimensions ? \'parcelId\'')
            .getRawOne();
        return parseInt(result.count) || 0;
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
    async calculateManualOverrideRate(startDate, endDate) {
        const totalDecisions = await this.metricsRepository
            .createQueryBuilder('metric')
            .where('metric.metricName = :metricName', { metricName: 'decision_processing_time' })
            .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getCount();
        const overrides = await this.sumMetricValue('manual_overrides', startDate, endDate);
        return totalDecisions > 0 ? (overrides / totalDecisions) * 100 : 0;
    }
};
exports.MetricsCalculatorService = MetricsCalculatorService;
exports.MetricsCalculatorService = MetricsCalculatorService = MetricsCalculatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analytics_metric_entity_1.AnalyticsMetricEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(daily_metrics_summary_entity_1.DailyMetricsSummaryEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MetricsCalculatorService);
//# sourceMappingURL=metrics-calculator.service.js.map