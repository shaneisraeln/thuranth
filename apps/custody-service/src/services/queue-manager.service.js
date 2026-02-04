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
var QueueManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManagerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const custody_queue_entity_1 = require("../entities/custody-queue.entity");
const custody_service_1 = require("./custody.service");
let QueueManagerService = QueueManagerService_1 = class QueueManagerService {
    custodyQueueRepository;
    custodyService;
    configService;
    logger = new common_1.Logger(QueueManagerService_1.name);
    processingInterval;
    retryInterval;
    maxRetries;
    processingIntervalMs;
    retryIntervalMs;
    retryBackoffMs;
    constructor(custodyQueueRepository, custodyService, configService) {
        this.custodyQueueRepository = custodyQueueRepository;
        this.custodyService = custodyService;
        this.configService = configService;
        this.maxRetries = this.configService.get('CUSTODY_QUEUE_MAX_RETRIES', 5);
        this.processingIntervalMs = this.configService.get('CUSTODY_QUEUE_PROCESSING_INTERVAL_MS', 30000); // 30 seconds
        this.retryIntervalMs = this.configService.get('CUSTODY_QUEUE_RETRY_INTERVAL_MS', 300000); // 5 minutes
        this.retryBackoffMs = this.configService.get('CUSTODY_QUEUE_RETRY_BACKOFF_MS', 60000); // 1 minute
    }
    async onModuleInit() {
        this.startQueueProcessing();
        this.startRetryProcessing();
        this.logger.log('Queue manager initialized and processing started');
    }
    /**
     * Start periodic processing of pending queue items
     */
    startQueueProcessing() {
        this.processingInterval = setInterval(async () => {
            try {
                await this.processPendingItems();
            }
            catch (error) {
                this.logger.error('Error during queue processing', error);
            }
        }, this.processingIntervalMs);
        this.logger.log(`Queue processing started with interval: ${this.processingIntervalMs}ms`);
    }
    /**
     * Start periodic retry of failed items
     */
    startRetryProcessing() {
        this.retryInterval = setInterval(async () => {
            try {
                await this.retryFailedItems();
            }
            catch (error) {
                this.logger.error('Error during retry processing', error);
            }
        }, this.retryIntervalMs);
        this.logger.log(`Retry processing started with interval: ${this.retryIntervalMs}ms`);
    }
    /**
     * Process pending queue items
     */
    async processPendingItems() {
        const batchSize = this.configService.get('CUSTODY_QUEUE_BATCH_SIZE', 10);
        const pendingItems = await this.custodyQueueRepository.find({
            where: { status: custody_queue_entity_1.QueueStatus.PENDING },
            order: { createdAt: 'ASC' },
            take: batchSize,
        });
        if (pendingItems.length === 0) {
            return;
        }
        this.logger.log(`Processing ${pendingItems.length} pending queue items`);
        for (const item of pendingItems) {
            try {
                await this.processQueueItem(item);
            }
            catch (error) {
                this.logger.error(`Failed to process queue item ${item.id}`, error);
                await this.markItemAsFailed(item, error.message);
            }
        }
    }
    /**
     * Retry failed items with exponential backoff
     */
    async retryFailedItems() {
        const maxRetryCount = this.maxRetries;
        const backoffTime = new Date(Date.now() - this.retryBackoffMs);
        const failedItems = await this.custodyQueueRepository.find({
            where: {
                status: custody_queue_entity_1.QueueStatus.FAILED,
                retryCount: (0, typeorm_2.LessThan)(maxRetryCount),
                updatedAt: (0, typeorm_2.LessThan)(backoffTime),
            },
            order: { updatedAt: 'ASC' },
            take: 5, // Smaller batch for retries
        });
        if (failedItems.length === 0) {
            return;
        }
        this.logger.log(`Retrying ${failedItems.length} failed queue items`);
        for (const item of failedItems) {
            try {
                // Reset status to pending for retry
                item.status = custody_queue_entity_1.QueueStatus.PENDING;
                item.errorMessage = null;
                await this.custodyQueueRepository.save(item);
                await this.processQueueItem(item);
            }
            catch (error) {
                this.logger.error(`Retry failed for queue item ${item.id}`, error);
                await this.markItemAsFailed(item, error.message);
            }
        }
    }
    /**
     * Process a single queue item
     */
    async processQueueItem(item) {
        // Update status to processing
        item.status = custody_queue_entity_1.QueueStatus.PROCESSING;
        await this.custodyQueueRepository.save(item);
        try {
            // Use the custody service to process the transfer
            await this.custodyService.recordCustodyTransfer(item.custodyTransfer);
            // Mark as completed
            item.status = custody_queue_entity_1.QueueStatus.COMPLETED;
            item.processedAt = new Date();
            item.errorMessage = null;
            await this.custodyQueueRepository.save(item);
            this.logger.log(`Successfully processed queue item ${item.id}`);
        }
        catch (error) {
            throw error; // Re-throw to be handled by caller
        }
    }
    /**
     * Mark an item as failed and increment retry count
     */
    async markItemAsFailed(item, errorMessage) {
        item.status = custody_queue_entity_1.QueueStatus.FAILED;
        item.errorMessage = errorMessage;
        item.retryCount += 1;
        await this.custodyQueueRepository.save(item);
        if (item.retryCount >= this.maxRetries) {
            this.logger.error(`Queue item ${item.id} exceeded max retries (${this.maxRetries}). Manual intervention required.`);
        }
    }
    /**
     * Get queue statistics
     */
    async getQueueStatistics() {
        const [pending, processing, completed, failed] = await Promise.all([
            this.custodyQueueRepository.count({ where: { status: custody_queue_entity_1.QueueStatus.PENDING } }),
            this.custodyQueueRepository.count({ where: { status: custody_queue_entity_1.QueueStatus.PROCESSING } }),
            this.custodyQueueRepository.count({ where: { status: custody_queue_entity_1.QueueStatus.COMPLETED } }),
            this.custodyQueueRepository.count({ where: { status: custody_queue_entity_1.QueueStatus.FAILED } }),
        ]);
        const totalRetriesResult = await this.custodyQueueRepository
            .createQueryBuilder('queue')
            .select('SUM(queue.retryCount)', 'totalRetries')
            .getRawOne();
        const oldestPendingResult = await this.custodyQueueRepository.findOne({
            where: { status: custody_queue_entity_1.QueueStatus.PENDING },
            order: { createdAt: 'ASC' },
        });
        return {
            pending,
            processing,
            completed,
            failed,
            totalRetries: parseInt(totalRetriesResult?.totalRetries || '0'),
            oldestPending: oldestPendingResult?.createdAt,
        };
    }
    /**
     * Clean up old completed items
     */
    async cleanupCompletedItems(olderThanDays = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        const result = await this.custodyQueueRepository.delete({
            status: custody_queue_entity_1.QueueStatus.COMPLETED,
            processedAt: (0, typeorm_2.LessThan)(cutoffDate),
        });
        const deletedCount = result.affected || 0;
        this.logger.log(`Cleaned up ${deletedCount} completed queue items older than ${olderThanDays} days`);
        return deletedCount;
    }
    /**
     * Force retry of a specific failed item
     */
    async forceRetry(itemId) {
        const item = await this.custodyQueueRepository.findOne({ where: { id: itemId } });
        if (!item) {
            return false;
        }
        if (item.status !== custody_queue_entity_1.QueueStatus.FAILED) {
            this.logger.warn(`Cannot retry item ${itemId} with status ${item.status}`);
            return false;
        }
        try {
            item.status = custody_queue_entity_1.QueueStatus.PENDING;
            item.errorMessage = null;
            await this.custodyQueueRepository.save(item);
            this.logger.log(`Forced retry for queue item ${itemId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to force retry for item ${itemId}`, error);
            return false;
        }
    }
    /**
     * Get failed items that need manual intervention
     */
    async getFailedItemsNeedingIntervention() {
        return await this.custodyQueueRepository.find({
            where: {
                status: custody_queue_entity_1.QueueStatus.FAILED,
                retryCount: (0, typeorm_2.MoreThan)(this.maxRetries - 1),
            },
            order: { updatedAt: 'ASC' },
        });
    }
    /**
     * Stop queue processing (for graceful shutdown)
     */
    async stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
            this.retryInterval = null;
        }
        this.logger.log('Queue processing stopped');
    }
};
exports.QueueManagerService = QueueManagerService;
exports.QueueManagerService = QueueManagerService = QueueManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(custody_queue_entity_1.CustodyQueueEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        custody_service_1.CustodyService,
        config_1.ConfigService])
], QueueManagerService);
//# sourceMappingURL=queue-manager.service.js.map