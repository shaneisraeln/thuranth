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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const audit_logger_service_1 = require("../services/audit-logger.service");
const audit_log_entity_1 = require("../entities/audit-log.entity");
let AuditController = class AuditController {
    auditLoggerService;
    constructor(auditLoggerService) {
        this.auditLoggerService = auditLoggerService;
    }
    async createAuditLog(request) {
        try {
            const auditLog = await this.auditLoggerService.createAuditLog(request);
            return {
                success: true,
                data: { id: auditLog.id },
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to create audit log: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async logDecision(body) {
        try {
            await this.auditLoggerService.logDecision(body.parcelId, body.decisionData, body.userId, body.correlationId);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to log decision: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async logManualOverride(body) {
        try {
            await this.auditLoggerService.logManualOverride(body.entityType, body.entityId, body.overrideData, body.userId, body.ipAddress, body.userAgent, body.sessionId, body.correlationId);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to log manual override: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async logSecurityEvent(body) {
        try {
            await this.auditLoggerService.logSecurityEvent(body.eventData, body.userId, body.ipAddress, body.userAgent, body.sessionId);
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to log security event: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getAuditLogs(eventType, entityType, entityId, userId, serviceName, correlationId, startDate, endDate, limit, offset) {
        try {
            const filter = {
                eventType,
                entityType,
                entityId,
                userId,
                serviceName,
                correlationId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                limit: limit ? parseInt(limit.toString()) : undefined,
                offset: offset ? parseInt(offset.toString()) : undefined,
            };
            const logs = await this.auditLoggerService.getAuditLogs(filter);
            return {
                success: true,
                data: logs,
                count: logs.length,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to retrieve audit logs: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateAuditReport(request) {
        try {
            const report = await this.auditLoggerService.generateAuditReport(request);
            return {
                success: true,
                data: report,
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to generate audit report: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async verifyLogIntegrity(logId) {
        try {
            const isValid = await this.auditLoggerService.verifyLogIntegrity(logId);
            return {
                success: true,
                data: {
                    logId,
                    isValid,
                    message: isValid ? 'Log integrity verified' : 'Log integrity compromised',
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to verify log integrity: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Post)('log'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an audit log entry' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Audit log created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "createAuditLog", null);
__decorate([
    (0, common_1.Post)('log/decision'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a decision engine evaluation' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Decision audit log created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "logDecision", null);
__decorate([
    (0, common_1.Post)('log/override'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a manual override with justification' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Override audit log created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "logManualOverride", null);
__decorate([
    (0, common_1.Post)('log/security'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a security event' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Security audit log created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "logSecurityEvent", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve audit logs with filtering' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit logs retrieved successfully' }),
    __param(0, (0, common_1.Query)('eventType')),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('userId')),
    __param(4, (0, common_1.Query)('serviceName')),
    __param(5, (0, common_1.Query)('correlationId')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __param(8, (0, common_1.Query)('limit')),
    __param(9, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Post)('report'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate audit report for specified period' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit report generated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "generateAuditReport", null);
__decorate([
    (0, common_1.Get)('verify/:logId'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify the cryptographic integrity of an audit log' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Integrity verification completed' }),
    __param(0, (0, common_1.Param)('logId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "verifyLogIntegrity", null);
exports.AuditController = AuditController = __decorate([
    (0, swagger_1.ApiTags)('audit'),
    (0, common_1.Controller)('audit'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [audit_logger_service_1.AuditLoggerService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map