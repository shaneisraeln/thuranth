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
var HealthCheckService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const blockchain_client_interface_1 = require("../blockchain/blockchain-client.interface");
const blockchain_client_factory_1 = require("../blockchain/blockchain-client.factory");
let HealthCheckService = HealthCheckService_1 = class HealthCheckService {
    blockchainClientFactory;
    configService;
    logger = new common_1.Logger(HealthCheckService_1.name);
    blockchainClient;
    healthCheckInterval;
    healthCheckIntervalMs;
    lastHealthCheck;
    constructor(blockchainClientFactory, configService) {
        this.blockchainClientFactory = blockchainClientFactory;
        this.configService = configService;
        this.healthCheckIntervalMs = this.configService.get('HEALTH_CHECK_INTERVAL_MS', 60000); // 1 minute
    }
    async onModuleInit() {
        await this.initializeBlockchainClient();
        this.startHealthChecks();
        this.logger.log('Health check service initialized');
    }
    async initializeBlockchainClient() {
        try {
            const blockchainConfig = {
                type: this.configService.get('BLOCKCHAIN_TYPE', blockchain_client_interface_1.BlockchainType.HYPERLEDGER_FABRIC),
                connectionString: this.configService.get('BLOCKCHAIN_CONNECTION_STRING', 'localhost:7051'),
                credentials: {
                    privateKey: this.configService.get('BLOCKCHAIN_PRIVATE_KEY'),
                    certificate: this.configService.get('BLOCKCHAIN_CERTIFICATE'),
                    mspId: this.configService.get('BLOCKCHAIN_MSP_ID'),
                },
                contractAddress: this.configService.get('BLOCKCHAIN_CONTRACT_ADDRESS'),
                chaincodeName: this.configService.get('BLOCKCHAIN_CHAINCODE_NAME', 'custody'),
            };
            this.blockchainClient = this.blockchainClientFactory.createClient(blockchainConfig);
            await this.blockchainClient.initialize();
        }
        catch (error) {
            this.logger.warn('Failed to initialize blockchain client for health checks', error);
            // Continue without blockchain client - health checks will report it as unhealthy
        }
    }
    startHealthChecks() {
        // Perform initial health check
        this.performHealthCheck();
        // Schedule periodic health checks
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            }
            catch (error) {
                this.logger.error('Error during health check', error);
            }
        }, this.healthCheckIntervalMs);
        this.logger.log(`Health checks started with interval: ${this.healthCheckIntervalMs}ms`);
    }
    async performHealthCheck() {
        const timestamp = new Date();
        const services = [];
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
        const systemHealth = {
            overall,
            services,
            timestamp,
        };
        this.lastHealthCheck = systemHealth;
        if (overall !== 'healthy') {
            this.logger.warn(`System health check: ${overall}`, { services });
        }
        else {
            this.logger.debug('System health check: healthy');
        }
        return systemHealth;
    }
    async checkBlockchainHealth() {
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
            }
            else {
                return {
                    service,
                    status: 'unhealthy',
                    lastChecked,
                    error: 'Blockchain not available',
                };
            }
        }
        catch (error) {
            return {
                service,
                status: 'unhealthy',
                lastChecked,
                error: error.message,
            };
        }
    }
    async checkDatabaseHealth() {
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
        }
        catch (error) {
            return {
                service,
                status: 'unhealthy',
                lastChecked,
                error: error.message,
            };
        }
    }
    async checkRedisHealth() {
        const redisEnabled = this.configService.get('REDIS_ENABLED', false);
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
        }
        catch (error) {
            return {
                service,
                status: 'unhealthy',
                lastChecked,
                error: error.message,
            };
        }
    }
    determineOverallHealth(services) {
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
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }
    /**
     * Check if blockchain is currently available
     */
    async isBlockchainAvailable() {
        try {
            if (!this.blockchainClient) {
                return false;
            }
            return await this.blockchainClient.isAvailable();
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get blockchain network status
     */
    async getBlockchainNetworkStatus() {
        try {
            if (!this.blockchainClient) {
                return { connected: false };
            }
            return await this.blockchainClient.getNetworkStatus();
        }
        catch (error) {
            return { connected: false };
        }
    }
    /**
     * Stop health checks (for graceful shutdown)
     */
    async stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.logger.log('Health checks stopped');
    }
};
exports.HealthCheckService = HealthCheckService;
exports.HealthCheckService = HealthCheckService = HealthCheckService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [blockchain_client_factory_1.BlockchainClientFactory,
        config_1.ConfigService])
], HealthCheckService);
//# sourceMappingURL=health-check.service.js.map