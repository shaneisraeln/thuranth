import { Controller, Get, Post, Param, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QueueManagerService } from '../services/queue-manager.service';
import { HealthCheckService, SystemHealth } from '../services/health-check.service';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private readonly queueManagerService: QueueManagerService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ 
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
  })
  async getHealth(): Promise<SystemHealth> {
    try {
      const health = await this.healthCheckService.performHealthCheck();
      
      // Set appropriate HTTP status based on health
      if (health.overall === 'unhealthy') {
        throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
      }
      
      return health;
    } catch (error) {
      this.logger.error('Failed to get health status', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to get health status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health/blockchain')
  @ApiOperation({ summary: 'Get blockchain connectivity status' })
  @ApiResponse({ 
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
  })
  async getBlockchainHealth(): Promise<{
    available: boolean;
    networkStatus: any;
    timestamp: Date;
  }> {
    try {
      const available = await this.healthCheckService.isBlockchainAvailable();
      const networkStatus = await this.healthCheckService.getBlockchainNetworkStatus();
      
      return {
        available,
        networkStatus,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get blockchain health', error);
      throw new HttpException(
        'Failed to get blockchain health',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ 
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
  })
  async getQueueStatistics(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalRetries: number;
    oldestPending?: Date;
  }> {
    try {
      return await this.queueManagerService.getQueueStatistics();
    } catch (error) {
      this.logger.error('Failed to get queue statistics', error);
      throw new HttpException(
        'Failed to get queue statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('queue/failed')
  @ApiOperation({ summary: 'Get failed queue items needing intervention' })
  @ApiResponse({ 
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
  })
  async getFailedItems(): Promise<any[]> {
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
    } catch (error) {
      this.logger.error('Failed to get failed queue items', error);
      throw new HttpException(
        'Failed to get failed queue items',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('queue/retry/:itemId')
  @ApiOperation({ summary: 'Force retry of a failed queue item' })
  @ApiParam({ name: 'itemId', description: 'Queue item identifier' })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 404, description: 'Queue item not found' })
  async forceRetry(@Param('itemId') itemId: string): Promise<{
    success: boolean;
    message: string;
    timestamp: Date;
  }> {
    try {
      if (!itemId) {
        throw new HttpException('Item ID is required', HttpStatus.BAD_REQUEST);
      }

      const success = await this.queueManagerService.forceRetry(itemId);
      
      if (!success) {
        throw new HttpException('Queue item not found or cannot be retried', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: `Retry initiated for queue item ${itemId}`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to force retry for item ${itemId}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to force retry',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('queue/cleanup')
  @ApiOperation({ summary: 'Clean up old completed queue items' })
  @ApiResponse({ 
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
  })
  async cleanupQueue(): Promise<{
    deletedCount: number;
    message: string;
    timestamp: Date;
  }> {
    try {
      const deletedCount = await this.queueManagerService.cleanupCompletedItems();
      
      return {
        deletedCount,
        message: `Cleaned up ${deletedCount} completed queue items`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to cleanup queue', error);
      throw new HttpException(
        'Failed to cleanup queue',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('queue/process')
  @ApiOperation({ summary: 'Manually trigger queue processing' })
  @ApiResponse({ 
    status: 200, 
    description: 'Queue processing triggered',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async triggerQueueProcessing(): Promise<{
    message: string;
    timestamp: Date;
  }> {
    try {
      await this.queueManagerService.processPendingItems();
      
      return {
        message: 'Queue processing triggered successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to trigger queue processing', error);
      throw new HttpException(
        'Failed to trigger queue processing',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}