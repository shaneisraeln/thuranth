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
exports.AdvancedAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const advanced_analytics_interfaces_1 = require("../interfaces/advanced-analytics.interfaces");
const advanced_analytics_service_1 = require("../services/advanced-analytics.service");
const custom_kpi_service_1 = require("../services/custom-kpi.service");
const shared_1 = require("@pdcp/shared");
const shared_2 = require("@pdcp/shared");
const auth_interfaces_1 = require("../../../auth-service/src/interfaces/auth.interfaces");
let AdvancedAnalyticsController = class AdvancedAnalyticsController {
    advancedAnalyticsService;
    customKPIService;
    constructor(advancedAnalyticsService, customKPIService) {
        this.advancedAnalyticsService = advancedAnalyticsService;
        this.customKPIService = customKPIService;
    }
    async getImpactMeasurementDashboard(startDate, endDate, granularity = advanced_analytics_interfaces_1.TimeGranularity.DAY) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity
        };
        // Validate date range
        if (timeRange.start >= timeRange.end) {
            throw new common_1.BadRequestException('Start date must be before end date');
        }
        const maxDays = 365; // Maximum 1 year range
        const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > maxDays) {
            throw new common_1.BadRequestException(`Date range cannot exceed ${maxDays} days`);
        }
        return this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
    }
    async createCustomKPI(definition, user) {
        // Set the owner to the current user if not specified
        if (!definition.owner) {
            definition.owner = user.id;
        }
        return this.customKPIService.createCustomKPI(definition);
    }
    async updateCustomKPI(id, definition) {
        return this.customKPIService.updateCustomKPI(id, definition);
    }
    async deleteCustomKPI(id) {
        return this.customKPIService.deleteCustomKPI(id);
    }
    async getCustomKPIs(category, owner, isActive) {
        return this.customKPIService.getCustomKPIs(category, owner, isActive);
    }
    async getCustomKPIById(id) {
        return this.customKPIService.getCustomKPIById(id);
    }
    async calculateCustomKPI(id, request) {
        if (!request.startDate || !request.endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const calculationRequest = {
            kpiId: id,
            timeRange: {
                start: new Date(request.startDate),
                end: new Date(request.endDate),
                granularity: request.granularity || advanced_analytics_interfaces_1.TimeGranularity.DAY
            },
            filters: request.filters
        };
        return this.customKPIService.calculateCustomKPI(calculationRequest);
    }
    async calculateAllActiveKPIs(request) {
        if (!request.startDate || !request.endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(request.startDate),
            end: new Date(request.endDate),
            granularity: request.granularity || advanced_analytics_interfaces_1.TimeGranularity.DAY
        };
        return this.customKPIService.calculateAllActiveKPIs(timeRange);
    }
    async getKPIHistory(id, startDate, endDate, granularity = 'day') {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity: granularity
        };
        return this.customKPIService.getKPIHistory(id, timeRange, granularity);
    }
    async getBenchmarkingData(startDate, endDate, metrics) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity: advanced_analytics_interfaces_1.TimeGranularity.DAY
        };
        const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
        // Filter benchmarking data based on requested metrics
        let benchmarkingData = dashboard.benchmarking;
        if (metrics) {
            const requestedMetrics = metrics.split(',').map(m => m.trim());
            benchmarkingData = {
                ...benchmarkingData,
                industryBenchmarks: benchmarkingData.industryBenchmarks.filter(benchmark => requestedMetrics.includes(benchmark.metricName))
            };
        }
        return benchmarkingData;
    }
    async getTrendAnalysis(startDate, endDate, metrics) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity: advanced_analytics_interfaces_1.TimeGranularity.DAY
        };
        const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
        return dashboard.trendAnalysis;
    }
    async getFinancialImpact(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity: advanced_analytics_interfaces_1.TimeGranularity.DAY
        };
        const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
        return {
            financialImpact: dashboard.financialImpact,
            primaryMetrics: dashboard.primaryMetrics,
            secondaryMetrics: dashboard.secondaryMetrics
        };
    }
    async getEnvironmentalImpact(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity: advanced_analytics_interfaces_1.TimeGranularity.DAY
        };
        const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
        return dashboard.environmentalImpact;
    }
    async getOperationalEfficiency(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start date and end date are required');
        }
        const timeRange = {
            start: new Date(startDate),
            end: new Date(endDate),
            granularity: advanced_analytics_interfaces_1.TimeGranularity.DAY
        };
        const dashboard = await this.advancedAnalyticsService.generateImpactMeasurementDashboard(timeRange);
        return dashboard.operationalEfficiency;
    }
};
exports.AdvancedAnalyticsController = AdvancedAnalyticsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get comprehensive impact measurement dashboard' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dashboard data retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid time range parameters' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('granularity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getImpactMeasurementDashboard", null);
__decorate([
    (0, common_1.Post)('custom-kpis'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.MANAGE_SYSTEM),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new custom KPI definition' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Custom KPI created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid KPI definition' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, shared_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "createCustomKPI", null);
__decorate([
    (0, common_1.Put)('custom-kpis/:id'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.MANAGE_SYSTEM),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing custom KPI definition' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Custom KPI updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Custom KPI not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "updateCustomKPI", null);
__decorate([
    (0, common_1.Delete)('custom-kpis/:id'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.MANAGE_SYSTEM),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a custom KPI definition' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Custom KPI deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Custom KPI not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "deleteCustomKPI", null);
__decorate([
    (0, common_1.Get)('custom-kpis'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get all custom KPIs with optional filtering' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Custom KPIs retrieved successfully' }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('owner')),
    __param(2, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Boolean]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getCustomKPIs", null);
__decorate([
    (0, common_1.Get)('custom-kpis/:id'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific custom KPI by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Custom KPI retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Custom KPI not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getCustomKPIById", null);
__decorate([
    (0, common_1.Post)('custom-kpis/:id/calculate'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate a custom KPI value for a specific time range' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Custom KPI calculated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid calculation request' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Custom KPI not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "calculateCustomKPI", null);
__decorate([
    (0, common_1.Post)('custom-kpis/calculate-all'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate all active custom KPIs for a time range' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All custom KPIs calculated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid time range parameters' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "calculateAllActiveKPIs", null);
__decorate([
    (0, common_1.Get)('custom-kpis/:id/history'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get KPI calculation history' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KPI history retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Custom KPI not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('granularity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getKPIHistory", null);
__decorate([
    (0, common_1.Get)('benchmarking'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get benchmarking data for key metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Benchmarking data retrieved successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('metrics')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getBenchmarkingData", null);
__decorate([
    (0, common_1.Get)('trends'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get trend analysis data' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Trend analysis data retrieved successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('metrics')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getTrendAnalysis", null);
__decorate([
    (0, common_1.Get)('financial-impact'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed financial impact analysis' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Financial impact data retrieved successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getFinancialImpact", null);
__decorate([
    (0, common_1.Get)('environmental-impact'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed environmental impact analysis' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Environmental impact data retrieved successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getEnvironmentalImpact", null);
__decorate([
    (0, common_1.Get)('operational-efficiency'),
    (0, shared_2.Permissions)(auth_interfaces_1.Permission.VIEW_ANALYTICS),
    (0, swagger_1.ApiOperation)({ summary: 'Get operational efficiency metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Operational efficiency data retrieved successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdvancedAnalyticsController.prototype, "getOperationalEfficiency", null);
exports.AdvancedAnalyticsController = AdvancedAnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Advanced Analytics'),
    (0, common_1.Controller)('advanced-analytics'),
    (0, common_1.UseGuards)(shared_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [advanced_analytics_service_1.AdvancedAnalyticsService,
        custom_kpi_service_1.CustomKPIService])
], AdvancedAnalyticsController);
//# sourceMappingURL=advanced-analytics.controller.js.map