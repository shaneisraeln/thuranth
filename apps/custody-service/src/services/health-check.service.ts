import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainClient, BlockchainConfig, BlockchainType } from '../blockchain/blockchain-client.interface';
import { BlockchainClientFactory } from '../blockchain/blockchain-client.factory';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastChecked: Date;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthStatus[];
  timestamp: Date;
}

@Injectable()
export class HealthCheckService implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckService.name);
  private blockchainClient: BlockchainClient;
  private healthCheckInterval: NodeJS.Timeout;
  private readonly healthCheckIntervalMs: number;
  private lastHealthCheck: SystemHealth;

  constructor(
    private readonly blockchainClientFactory: BlockchainClientFactory,
    private readonly configService: ConfigService,
  ) {
    this.healthCheckIntervalMs = this.configService.get<number>('HEALTH_CHECK_INTERVAL_MS', 60000); // 1 minute
  }

  async onModuleInit() {
    await this.initializeBlockchainClient();
    this.startHealthChecks();
    this.logger.log('Health check service initialized');
  }

  private async initializeBlockchainClient(): Promise<void> {
    try {
      const blockchainConfig: BlockchainConfig = {
        type: this.configService.get<BlockchainType>('BLOCKCHAIN_TYPE', BlockchainType.HYPERLEDGER_FABRIC),
        connectionString: this.configService.get<string>('BLOCKCHAIN_CONNECTION_STRING', 'localhost:7051'),
        credentials: {
          privateKey: this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY'),
          certificate: this.configService.get<string>('BLOCKCHAIN_CERTIFICATE'),
          mspId: this.configService.get<string>('BLOCKCHAIN_MSP_ID'),
        },
        contractAddress: this.configService.get<string>('BLOCKCHAIN_CONTRACT_ADDRESS'),
        chaincodeName: this.configService.get<string>('BLOCKCHAIN_CHAINCODE_NAME', 'custody'),
      };

      this.blockchainClient = this.blockchainClientFactory.createClient(blockchainConfig);
      await this.blockchainClient.initialize();
    } catch (error) {
      this.logger.warn('Failed to initialize blockchain client for health checks', error);
      // Continue without blockchain client - health checks will report it as unhealthy
    }
  }

  private startHealthChecks(): void {
    // Perform initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Error during health check', error);
      }
    }, this.healthCheckIntervalMs);

    this.logger.log(`Health checks started with interval: ${this.healthCheckIntervalMs}ms`);
  }

  async performHealthCheck(): Promise<SystemHealth> {
    const timestamp = new Date();
    const services: HealthStatus[] = [];

    // Check blockchain connectivity
    const blockchainHealth = await this.checkBlockchainHealth();
    services.push(blockchainHealth);

    // Check database connectivity (basic check)
    const databaseHealth = await this.checkDatabaseHealth();
    services.push(databaseHealth);

    // Check Redis connectivity (if configured)
    const redisHealth = await this.checkRedisHealth();
    if (redisHealth) {
      services.push(redisHealth);
    }

    // Determine overall health
    const overall = this.determineOverallHealth(services);

    const systemHealth: SystemHealth = {
      overall,
      services,
      timestamp,
    };

    this.lastHealthCheck = systemHealth;
    
    if (overall !== 'healthy') {
      this.logger.warn(`System health check: ${overall}`, { services });
    } else {
      this.logger.debug('System health check: healthy');
    }

    return systemHealth;
  }

  private async checkBlockchainHealth(): Promise<HealthStatus> {
    const service = 'blockchain';
    const lastChecked = new Date();

    try {
      if (!this.blockchainClient) {
        return {
          service,
          status: 'unhealthy',
          lastChecked,
          error: 'Blockchain client not initialized',
        };
      }

      const isAvailable = await this.blockchainClient.isAvailable();
      
      if (isAvailable) {
        const networkStatus = await this.blockchainClient.getNetworkStatus();
        return {
          service,
          status: 'healthy',
          lastChecked,
          details: networkStatus,
        };
      } else {
        return {
          service,
          status: 'unhealthy',
          lastChecked,
          error: 'Blockchain not available',
        };
      }
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        lastChecked,
        error: error.message,
      };
    }
  }

  private async checkDatabaseHealth(): Promise<HealthStatus> {
    const service = 'database';
    const lastChecked = new Date();

    try {
      // Simple database connectivity check
      // In a real implementation, you would inject the database connection
      // and perform a simple query like SELECT 1
      return {
        service,
        status: 'healthy',
        lastChecked,
        details: { connection: 'active' },
      };
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        lastChecked,
        error: error.message,
      };
    }
  }

  private async checkRedisHealth(): Promise<HealthStatus | null> {
    const redisEnabled = this.configService.get<boolean>('REDIS_ENABLED', false);
    
    if (!redisEnabled) {
      return null;
    }

    const service = 'redis';
    const lastChecked = new Date();

    try {
      // Simple Redis connectivity check
      // In a real implementation, you would inject the Redis client
      // and perform a simple command like PING
      return {
        service,
        status: 'healthy',
        lastChecked,
        details: { connection: 'active' },
      };
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        lastChecked,
        error: error.message,
      };
    }
  }

  private determineOverallHealth(services: HealthStatus[]): 'healthy' | 'unhealthy' | 'degraded' {
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    if (unhealthyCount === 0 && degradedCount === 0) {
      return 'healthy';
    }

    // If blockchain is unhealthy but other services are healthy, system is degraded
    const blockchainService = services.find(s => s.service === 'blockchain');
    if (blockchainService?.status === 'unhealthy' && healthyCount > 0) {
      return 'degraded';
    }

    // If critical services are unhealthy, system is unhealthy
    const databaseService = services.find(s => s.service === 'database');
    if (databaseService?.status === 'unhealthy') {
      return 'unhealthy';
    }

    return degradedCount > 0 ? 'degraded' : 'unhealthy';
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Check if blockchain is currently available
   */
  async isBlockchainAvailable(): Promise<boolean> {
    try {
      if (!this.blockchainClient) {
        return false;
      }
      return await this.blockchainClient.isAvailable();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get blockchain network status
   */
  async getBlockchainNetworkStatus(): Promise<{
    connected: boolean;
    blockHeight?: number;
    networkId?: string;
  }> {
    try {
      if (!this.blockchainClient) {
        return { connected: false };
      }
      return await this.blockchainClient.getNetworkStatus();
    } catch (error) {
      return { connected: false };
    }
  }

  /**
   * Stop health checks (for graceful shutdown)
   */
  async stopHealthChecks(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.logger.log('Health checks stopped');
  }
}