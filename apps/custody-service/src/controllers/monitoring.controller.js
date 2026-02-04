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
var MonitoringController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const queue_manager_service_1 = require("../services/queue-manager.service");
const health_check_service_1 = require("../services/health-check.service");
let MonitoringController = MonitoringController_1 = class MonitoringController {
    queueManagerService;
    healthCheckService;
    logger = new common_1.Logger(MonitoringController_1.name);
    constructor(queueManagerService, healthCheckService) {
        this.queueManagerService = queueManagerService;
        this.healthCheckService = healthCheckService;
    }
    async getHealth() {
        try {
            const health = await this.healthCheckService.performHealthCheck();
            // Set appropriate HTTP status based on health
            if (health.overall === 'unhealthy') {
                throw new common_1.HttpException(health, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            return health;
        }
        catch (error) {
            this.logger.error('Failed to get health status', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get health status', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getBlockchainHealth() {
        try {
            const available = await this.healthCheckService.isBlockchainAvailable();
            const networkStatus = await this.healthCheckService.getBlockchainNetworkStatus();
            return {
                available,
                networkStatus,
                timestamp: new Date(),
            };
        }
        catch (error) {
            this.logger.error('Failed to get blockchain health', error);
            throw new common_1.HttpException('Failed to get blockchain health', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getQueueStatistics() {
        try {
            return await this.queueManagerService.getQueueStatistics();
        }
        catch (error) {
            this.logger.error('Failed to get queue statistics', error);
            throw new common_1.HttpException('Failed to get queue statistics', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getFailedItems() {
        try {
            const failedItems = await this.queueManagerService.getFailedItemsNeedingIntervention();
            // Remove sensitive data before returning
            return failedItems.map(item => ({
                id: item.id,
                parcelId: item.custodyTransfer.parcelId,
                fromParty: item.custodyTransfer.fromParty,
                toParty: item.custodyTransfer.toParty,
                status: item.status,
                retryCount: item.retryCount,
                errorMessage: item.errorMessage,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            }));
        }
        catch (error) {
            this.logger.error('Failed to get failed queue items', error);
            throw new common_1.HttpException('Failed to get failed queue items', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async forceRetry(itemId) {
        try {
            if (!itemId) {
                throw new common_1.HttpException('Item ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const success = await this.queueManagerService.forceRetry(itemId);
            if (!success) {
                throw new common_1.HttpException('Queue item not found or cannot be retried', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                message: `Retry initiated for queue item ${itemId}`,
                timestamp: new Date(),
            };
        }
        catch (error) {
            this.logger.error(`Failed to force retry for item ${itemId}`, error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to force retry', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async cleanupQueue() {
        try {
            const deletedCount = await this.queueManagerService.cleanupCompletedItems();
            return {
                deletedCount,
                message: `Cleaned up ${deletedCount} completed queue items`,
                timestamp: new Date(),
            };
        }
        catch (error) {
            this.logger.error('Failed to cleanup queue', error);
            throw new common_1.HttpException('Failed to cleanup queue', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async triggerQueueProcessing() {
        try {
            await this.queueManagerService.processPendingItems();
            return {
                message: 'Queue processing triggered successfully',
                timestamp: new Date(),
            };
        }
        catch (error) {
            this.logger.error('Failed to trigger queue processing', error);
            throw new common_1.HttpException('Failed to trigger queue processing', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.MonitoringController = MonitoringController;
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Get system health status' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'System health status',
        schema: {
            type: 'object',
            properties: {
                overall: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                services: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            service: { type: 'string' },
                            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                            lastChecked: { type: 'string', format: 'date-time' },
                            details: { type: 'object' },
                            error: { type: 'string' }
                        }
                    }
                },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('health/blockchain'),
    (0, swagger_1.ApiOperation)({ summary: 'Get blockchain connectivity status' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Blockchain connectivity status',
        schema: {
            type: 'object',
            properties: {
                available: { type: 'boolean' },
                networkStatus: {
                    type: 'object',
                    properties: {
                        connected: { type: 'boolean' },
                        blockHeight: { type: 'number' },
                        networkId: { type: 'string' }
                    }
                },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getBlockchainHealth", null);
__decorate([
    (0, common_1.Get)('queue/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get queue statistics' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Queue statistics',
        schema: {
            type: 'object',
            properties: {
                pending: { type: 'number' },
                processing: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' },
                totalRetries: { type: 'number' },
                oldestPending: { type: 'string', format: 'date-time' }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getQueueStatistics", null);
__decorate([
    (0, common_1.Get)('queue/failed'),
    (0, swagger_1.ApiOperation)({ summary: 'Get failed queue items needing intervention' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Failed queue items',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    custodyTransfer: { type: 'object' },
                    status: { type: 'string' },
                    retryCount: { type: 'number' },
                    errorMessage: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getFailedItems", null);
__decorate([
    (0, common_1.Post)('queue/retry/:itemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Force retry of a failed queue item' }),
    (0, swagger_1.ApiParam)({ name: 'itemId', description: 'Queue item identifier' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Retry initiated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Queue item not found' }),
    __param(0, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "forceRetry", null);
__decorate([
    (0, common_1.Post)('queue/cleanup'),
    (0, swagger_1.ApiOperation)({ summary: 'Clean up old completed queue items' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Cleanup completed',
        schema: {
            type: 'object',
            properties: {
                deletedCount: { type: 'number' },
                message: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "cleanupQueue", null);
__decorate([
    (0, common_1.Post)('queue/process'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger queue processing' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Queue processing triggered',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "triggerQueueProcessing", null);
exports.MonitoringController = MonitoringController = MonitoringController_1 = __decorate([
    (0, swagger_1.ApiTags)('monitoring'),
    (0, common_1.Controller)('monitoring'),
    __metadata("design:paramtypes", [queue_manager_service_1.QueueManagerService,
        health_check_service_1.HealthCheckService])
], MonitoringController);
//# sourceMappingURL=monitoring.controller.js.map