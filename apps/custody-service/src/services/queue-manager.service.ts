import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CustodyQueueEntity, QueueStatus } from '../entities/custody-queue.entity';
import { CustodyService } from './custody.service';

@Injectable()
export class QueueManagerService implements OnModuleInit {
  private readonly logger = new Logger(QueueManagerService.name);
  private processingInterval: NodeJS.Timeout;
  private retryInterval: NodeJS.Timeout;
  private readonly maxRetries: number;
  private readonly processingIntervalMs: number;
  private readonly retryIntervalMs: number;
  private readonly retryBackoffMs: number;

  constructor(
    @InjectRepository(CustodyQueueEntity)
    private readonly custodyQueueRepository: Repository<CustodyQueueEntity>,
    private readonly custodyService: CustodyService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('CUSTODY_QUEUE_MAX_RETRIES', 5);
    this.processingIntervalMs = this.configService.get<number>('CUSTODY_QUEUE_PROCESSING_INTERVAL_MS', 30000); // 30 seconds
    this.retryIntervalMs = this.configService.get<number>('CUSTODY_QUEUE_RETRY_INTERVAL_MS', 300000); // 5 minutes
    this.retryBackoffMs = this.configService.get<number>('CUSTODY_QUEUE_RETRY_BACKOFF_MS', 60000); // 1 minute
  }

  async onModuleInit() {
    this.startQueueProcessing();
    this.startRetryProcessing();
    this.logger.log('Queue manager initialized and processing started');
  }

  /**
   * Start periodic processing of pending queue items
   */
  private startQueueProcessing(): void {
    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingItems();
      } catch (error) {
        this.logger.error('Error during queue processing', error);
      }
    }, this.processingIntervalMs);

    this.logger.log(`Queue processing started with interval: ${this.processingIntervalMs}ms`);
  }

  /**
   * Start periodic retry of failed items
   */
  private startRetryProcessing(): void {
    this.retryInterval = setInterval(async () => {
      try {
        await this.retryFailedItems();
      } catch (error) {
        this.logger.error('Error during retry processing', error);
      }
    }, this.retryIntervalMs);

    this.logger.log(`Retry processing started with interval: ${this.retryIntervalMs}ms`);
  }

  /**
   * Process pending queue items
   */
  async processPendingItems(): Promise<void> {
    const batchSize = this.configService.get<number>('CUSTODY_QUEUE_BATCH_SIZE', 10);
    
    const pendingItems = await this.custodyQueueRepository.find({
      where: { status: QueueStatus.PENDING },
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
      } catch (error) {
        this.logger.error(`Failed to process queue item ${item.id}`, error);
        await this.markItemAsFailed(item, error.message);
      }
    }
  }

  /**
   * Retry failed items with exponential backoff
   */
  async retryFailedItems(): Promise<void> {
    const maxRetryCount = this.maxRetries;
    const backoffTime = new Date(Date.now() - this.retryBackoffMs);

    const failedItems = await this.custodyQueueRepository.find({
      where: {
        status: QueueStatus.FAILED,
        retryCount: LessThan(maxRetryCount),
        updatedAt: LessThan(backoffTime),
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
        item.status = QueueStatus.PENDING;
        item.errorMessage = null;
        await this.custodyQueueRepository.save(item);

        await this.processQueueItem(item);
      } catch (error) {
        this.logger.error(`Retry failed for queue item ${item.id}`, error);
        await this.markItemAsFailed(item, error.message);
      }
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: CustodyQueueEntity): Promise<void> {
    // Update status to processing
    item.status = QueueStatus.PROCESSING;
    await this.custodyQueueRepository.save(item);

    try {
      // Use the custody service to process the transfer
      await this.custodyService.recordCustodyTransfer(item.custodyTransfer);

      // Mark as completed
      item.status = QueueStatus.COMPLETED;
      item.processedAt = new Date();
      item.errorMessage = null;
      await this.custodyQueueRepository.save(item);

      this.logger.log(`Successfully processed queue item ${item.id}`);
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Mark an item as failed and increment retry count
   */
  private async markItemAsFailed(item: CustodyQueueEntity, errorMessage: string): Promise<void> {
    item.status = QueueStatus.FAILED;
    item.errorMessage = errorMessage;
    item.retryCount += 1;
    await this.custodyQueueRepository.save(item);

    if (item.retryCount >= this.maxRetries) {
      this.logger.error(
        `Queue item ${item.id} exceeded max retries (${this.maxRetries}). Manual intervention required.`
      );
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalRetries: number;
    oldestPending?: Date;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.custodyQueueRepository.count({ where: { status: QueueStatus.PENDING } }),
      this.custodyQueueRepository.count({ where: { status: QueueStatus.PROCESSING } }),
      this.custodyQueueRepository.count({ where: { status: QueueStatus.COMPLETED } }),
      this.custodyQueueRepository.count({ where: { status: QueueStatus.FAILED } }),
    ]);

    const totalRetriesResult = await this.custodyQueueRepository
      .createQueryBuilder('queue')
      .select('SUM(queue.retryCount)', 'totalRetries')
      .getRawOne();

    const oldestPendingResult = await this.custodyQueueRepository.findOne({
      where: { status: QueueStatus.PENDING },
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
  async cleanupCompletedItems(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.custodyQueueRepository.delete({
      status: QueueStatus.COMPLETED,
      processedAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;
    this.logger.log(`Cleaned up ${deletedCount} completed queue items older than ${olderThanDays} days`);
    
    return deletedCount;
  }

  /**
   * Force retry of a specific failed item
   */
  async forceRetry(itemId: string): Promise<boolean> {
    const item = await this.custodyQueueRepository.findOne({ where: { id: itemId } });
    
    if (!item) {
      return false;
    }

    if (item.status !== QueueStatus.FAILED) {
      this.logger.warn(`Cannot retry item ${itemId} with status ${item.status}`);
      return false;
    }

    try {
      item.status = QueueStatus.PENDING;
      item.errorMessage = null;
      await this.custodyQueueRepository.save(item);

      this.logger.log(`Forced retry for queue item ${itemId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to force retry for item ${itemId}`, error);
      return false;
    }
  }

  /**
   * Get failed items that need manual intervention
   */
  async getFailedItemsNeedingIntervention(): Promise<CustodyQueueEntity[]> {
    return await this.custodyQueueRepository.find({
      where: {
        status: QueueStatus.FAILED,
        retryCount: MoreThan(this.maxRetries - 1),
      },
      order: { updatedAt: 'ASC' },
    });
  }

  /**
   * Stop queue processing (for graceful shutdown)
   */
  async stopProcessing(): Promise<void> {
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
}