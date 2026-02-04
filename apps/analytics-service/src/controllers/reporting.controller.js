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
exports.ReportingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reporting_service_1 = require("../services/reporting.service");
let ReportingController = class ReportingController {
    reportingService;
    constructor(reportingService) {
        this.reportingService = reportingService;
    }
    async generateAnalyticsReport(startDate, endDate) {
        try {
            if (!startDate || !endDate) {
                throw new common_1.HttpException('Start date and end date are required', common_1.HttpStatus.BAD_REQUEST);
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new common_1.HttpException('Invalid date format', common_1.HttpStatus.BAD_REQUEST);
            }
            const report = await this.reportingService.generateAnalyticsReport(start, end);
            return {
                success: true,
                data: report,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to generate analytics report: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateImpactReport(request) {
        try {
            const report = await this.reportingService.generateImpactReport(request);
            return {
                success: true,
                data: report,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to generate impact report: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async defineCustomMetric(definition) {
        try {
            await this.reportingService.defineCustomMetric(definition);
            return {
                success: true,
                message: `Custom metric '${definition.name}' defined successfully`,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to define custom metric: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async calculateCustomMetric(metricName, startDate, endDate) {
        try {
            if (!startDate || !endDate) {
                throw new common_1.HttpException('Start date and end date are required', common_1.HttpStatus.BAD_REQUEST);
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new common_1.HttpException('Invalid date format', common_1.HttpStatus.BAD_REQUEST);
            }
            const value = await this.reportingService.calculateCustomMetric(metricName, start, end);
            return {
                success: true,
                data: {
                    metricName,
                    value,
                    period: { start, end },
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to calculate custom metric: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateAuditReport(startDate, endDate, eventTypes, entityTypes, userIds, includeEventData) {
        try {
            if (!startDate || !endDate) {
                throw new common_1.HttpException('Start date and end date are required', common_1.HttpStatus.BAD_REQUEST);
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new common_1.HttpException('Invalid date format', common_1.HttpStatus.BAD_REQUEST);
            }
            // This would typically call the audit service
            // For now, return a placeholder response
            const report = {
                period: { start, end },
                totalEvents: 0,
                eventsByType: {},
                eventsByUser: {},
                eventsByService: {},
                timeline: [],
                events: includeEventData ? [] : undefined,
            };
            return {
                success: true,
                data: report,
                message: 'Audit report functionality requires integration with audit service',
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to generate audit report: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ReportingController = ReportingController;
__decorate([
    (0, common_1.Get)('analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate comprehensive analytics report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Analytics report generated successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "generateAnalyticsReport", null);
__decorate([
    (0, common_1.Post)('impact'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate impact report with trend analysis' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Impact report generated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "generateImpactReport", null);
__decorate([
    (0, common_1.Post)('custom-metrics/define'),
    (0, swagger_1.ApiOperation)({ summary: 'Define a custom metric' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Custom metric defined successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "defineCustomMetric", null);
__decorate([
    (0, common_1.Get)('custom-metrics/:metricName'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate custom metric value' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Custom metric calculated successfully' }),
    __param(0, (0, common_1.Param)('metricName')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "calculateCustomMetric", null);
__decorate([
    (0, common_1.Get)('audit'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate audit report for specified period' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit report generated successfully' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('eventTypes')),
    __param(3, (0, common_1.Query)('entityTypes')),
    __param(4, (0, common_1.Query)('userIds')),
    __param(5, (0, common_1.Query)('includeEventData')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "generateAuditReport", null);
exports.ReportingController = ReportingController = __decorate([
    (0, swagger_1.ApiTags)('reporting'),
    (0, common_1.Controller)('reporting'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [reporting_service_1.ReportingService])
], ReportingController);
//# sourceMappingURL=reporting.controller.js.map