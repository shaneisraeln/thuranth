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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const metrics_calculator_service_1 = require("../services/metrics-calculator.service");
let AnalyticsController = class AnalyticsController {
    metricsCalculatorService;
    constructor(metricsCalculatorService) {
        this.metricsCalculatorService = metricsCalculatorService;
    }
    async recordMetric(request) {
        try {
            const metric = await this.metricsCalculatorService.recordMetric(request);
            return {
                success: true,
                data: { id: metric.id },
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to record metric: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async recordConsolidationEvent(event) {
        try {
            await this.metricsCalculatorService.recordConsolidationEvent(event);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to record consolidation event: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async recordVehicleUtilization(data) {
        try {
            await this.metricsCalculatorService.recordVehicleUtilization(data);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to record vehicle utilization: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async recordSLAPerformance(data) {
        try {
            await this.metricsCalculatorService.recordSLAPerformance(data);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to record SLA performance: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async recordDecisionPerformance(data) {
        try {
            await this.metricsCalculatorService.recordDecisionPerformance(data);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to record decision performance: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    calculateEmissions(params) {
        try {
            const result = this.metricsCalculatorService.calculateEmissions(params);
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to calculate emissions: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getMetrics(metricName, metricType, serviceName, startDate, endDate, limit, offset) {
        try {
            const filter = {
                metricName,
                metricType,
                serviceName,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                limit: limit ? parseInt(limit.toString()) : undefined,
                offset: offset ? parseInt(offset.toString()) : undefined,
            };
            const metrics = await this.metricsCalculatorService.getMetrics(filter);
            return {
                success: true,
                data: metrics,
                count: metrics.length,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to retrieve metrics: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async calculateDailySummary(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                throw new common_1.HttpException('Invalid date format', common_1.HttpStatus.BAD_REQUEST);
            }
            const summary = await this.metricsCalculatorService.calculateDailySummary(date);
            return {
                success: true,
                data: summary,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to calculate daily summary: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getDailySummaries(startDate, endDate) {
        try {
            if (!startDate || !endDate) {
                throw new common_1.HttpException('Start date and end date are required', common_1.HttpStatus.BAD_REQUEST);
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new common_1.HttpException('Invalid date format', common_1.HttpStatus.BAD_REQUEST);
            }
            const summaries = await this.metricsCalculatorService.getDailySummaries(start, end);
            return {
                success: true,
                data: summaries,
                count: summaries.length,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to retrieve daily summaries: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a metric' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Metric recorded successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "recordMetric", null);
__decorate([
    (0, common_1.Post)('consolidation'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a consolidation event' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Consolidation event recorded successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "recordConsolidationEvent", null);
__decorate([
    (0, common_1.Post)('utilization'),
    (0, swagger_1.ApiOperation)({ summary: 'Record vehicle utilization data' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Vehicle utilization recorded successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "recordVehicleUtilization", null);
__decorate([
    (0, common_1.Post)('sla-performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Record SLA performance data' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'SLA performance recorded successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "recordSLAPerformance", null);
__decorate([
    (0, common_1.Post)('decision-performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Record decision engine performance data' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Decision performance recorded successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "recordDecisionPerformance", null);
__decorate([
    (0, common_1.Post)('emissions/calculate'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate carbon emissions for a consolidation event' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Emissions calculated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "calculateEmissions", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get metrics with filtering' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Metrics retrieved successfully' }),
    __param(0, (0, common_1.Query)('metricName')),
    __param(1, (0, common_1.Query)('metricType')),
    __param(2, (0, common_1.Query)('serviceName')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Post)('daily-summary/:date'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate daily metrics summary for a specific date' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Daily summary calculated successfully' }),
    __param(0, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "calculateDailySummary", null);
__decorate([
    (0, common_1.Get)('daily-summaries'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily summaries for a date range' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Daily summaries retrieved successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDailySummaries", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [metrics_calculator_service_1.MetricsCalculatorService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map