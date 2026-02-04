"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PolygonEdgeClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonEdgeClient = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const crypto = __importStar(require("crypto"));
// Smart contract ABI for custody operations
const CUSTODY_CONTRACT_ABI = [
    'function recordCustodyTransfer(string recordId, string custodyData) external returns (bool)',
    'function getCustodyChain(string parcelId) external view returns (string[])',
    'function verifyCustodyRecord(string recordId, string custodyData) external view returns (bool)',
    'function ping() external view returns (bool)',
    'function getNetworkStatus() external view returns (uint256, string)',
    'event CustodyTransferRecorded(string indexed parcelId, string recordId, address indexed recorder)',
];
let PolygonEdgeClient = PolygonEdgeClient_1 = class PolygonEdgeClient {
    config;
    logger = new common_1.Logger(PolygonEdgeClient_1.name);
    provider;
    wallet;
    contract;
    isInitialized = false;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        try {
            this.logger.log('Initializing Polygon Edge client...');
            // Create provider
            this.provider = new ethers_1.ethers.JsonRpcProvider(this.config.connectionString);
            // Create wallet if private key provided
            if (this.config.credentials?.privateKey) {
                this.wallet = new ethers_1.ethers.Wallet(this.config.credentials.privateKey, this.provider);
            }
            else {
                throw new Error('Private key required for Polygon Edge client');
            }
            // Create contract instance
            if (!this.config.contractAddress) {
                throw new Error('Contract address required for Polygon Edge client');
            }
            this.contract = new ethers_1.ethers.Contract(this.config.contractAddress, CUSTODY_CONTRACT_ABI, this.wallet);
            // Test connection
            await this.provider.getNetwork();
            this.isInitialized = true;
            this.logger.log('Polygon Edge client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Polygon Edge client', error);
            throw error;
        }
    }
    async recordCustodyTransfer(transfer) {
        if (!this.isInitialized) {
            throw new Error('Blockchain client not initialized');
        }
        try {
            const custodyRecord = {
                parcelId: transfer.parcelId,
                fromParty: transfer.fromParty,
                toParty: transfer.toParty,
                timestamp: new Date(),
                location: transfer.location,
                digitalSignature: transfer.signature,
                metadata: transfer.metadata,
            };
            const recordId = this.generateRecordId(custodyRecord);
            const custodyData = JSON.stringify(custodyRecord);
            const tx = await this.contract.recordCustodyTransfer(recordId, custodyData);
            const receipt = await tx.wait();
            this.logger.log(`Custody transfer recorded with transaction hash: ${receipt.hash}`);
            return receipt.hash;
        }
        catch (error) {
            this.logger.error('Failed to record custody transfer', error);
            throw error;
        }
    }
    async getCustodyChain(parcelId) {
        if (!this.isInitialized) {
            throw new Error('Blockchain client not initialized');
        }
        try {
            const result = await this.contract.getCustodyChain(parcelId);
            return result.map((recordData) => {
                const record = JSON.parse(recordData);
                return {
                    ...record,
                    timestamp: new Date(record.timestamp),
                    verified: true,
                };
            });
        }
        catch (error) {
            this.logger.error(`Failed to get custody chain for parcel ${parcelId}`, error);
            throw error;
        }
    }
    async verifyCustodyRecord(record) {
        if (!this.isInitialized) {
            throw new Error('Blockchain client not initialized');
        }
        try {
            const custodyData = JSON.stringify({
                parcelId: record.parcelId,
                fromParty: record.fromParty,
                toParty: record.toParty,
                timestamp: record.timestamp,
                location: record.location,
                digitalSignature: record.digitalSignature,
                metadata: record.metadata,
            });
            const result = await this.contract.verifyCustodyRecord(record.id, custodyData);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to verify custody record ${record.id}`, error);
            return false;
        }
    }
    async isAvailable() {
        try {
            if (!this.isInitialized) {
                return false;
            }
            // Try a simple call to check connectivity
            await this.contract.ping();
            return true;
        }
        catch (error) {
            this.logger.warn('Blockchain is not available', error);
            return false;
        }
    }
    async getNetworkStatus() {
        try {
            if (!this.isInitialized) {
                return { connected: false };
            }
            const [blockHeight, networkId] = await this.contract.getNetworkStatus();
            const currentBlock = await this.provider.getBlockNumber();
            return {
                connected: true,
                blockHeight: currentBlock,
                networkId: networkId.toString(),
            };
        }
        catch (error) {
            this.logger.error('Failed to get network status', error);
            return { connected: false };
        }
    }
    generateRecordId(record) {
        const data = `${record.parcelId}-${record.fromParty}-${record.toParty}-${record.timestamp.toISOString()}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    async disconnect() {
        // Polygon Edge client doesn't need explicit disconnection
        this.isInitialized = false;
        this.logger.log('Polygon Edge client disconnected');
    }
};
exports.PolygonEdgeClient = PolygonEdgeClient;
exports.PolygonEdgeClient = PolygonEdgeClient = PolygonEdgeClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], PolygonEdgeClient);
//# sourceMappingURL=polygon-edge.client.js.map