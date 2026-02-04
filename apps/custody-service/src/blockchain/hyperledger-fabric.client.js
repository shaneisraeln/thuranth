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
var HyperledgerFabricClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperledgerFabricClient = void 0;
const common_1 = require("@nestjs/common");
const fabric_network_1 = require("fabric-network");
const crypto = __importStar(require("crypto"));
let HyperledgerFabricClient = HyperledgerFabricClient_1 = class HyperledgerFabricClient {
    config;
    logger = new common_1.Logger(HyperledgerFabricClient_1.name);
    gateway;
    network;
    contract;
    wallet;
    isInitialized = false;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        try {
            this.logger.log('Initializing Hyperledger Fabric client...');
            // Create wallet
            this.wallet = await fabric_network_1.Wallets.newInMemoryWallet();
            // Add identity to wallet if credentials provided
            if (this.config.credentials?.certificate && this.config.credentials?.privateKey) {
                const identity = {
                    credentials: {
                        certificate: this.config.credentials.certificate,
                        privateKey: this.config.credentials.privateKey,
                    },
                    mspId: this.config.credentials.mspId || 'Org1MSP',
                    type: 'X.509',
                };
                await this.wallet.put('appUser', identity);
            }
            // Create gateway
            this.gateway = new fabric_network_1.Gateway();
            await this.gateway.connect(this.config.connectionString, {
                wallet: this.wallet,
                identity: 'appUser',
                discovery: { enabled: true, asLocalhost: true },
            });
            // Get network and contract
            this.network = await this.gateway.getNetwork('mychannel');
            this.contract = this.network.getContract(this.config.chaincodeName || 'custody');
            this.isInitialized = true;
            this.logger.log('Hyperledger Fabric client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Hyperledger Fabric client', error);
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
            const result = await this.contract.submitTransaction('recordCustodyTransfer', recordId, JSON.stringify(custodyRecord));
            const txId = result.toString();
            this.logger.log(`Custody transfer recorded with transaction ID: ${txId}`);
            return txId;
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
            const result = await this.contract.evaluateTransaction('getCustodyChain', parcelId);
            const records = JSON.parse(result.toString());
            return records.map((record) => ({
                ...record,
                timestamp: new Date(record.timestamp),
                verified: true,
            }));
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
            const result = await this.contract.evaluateTransaction('verifyCustodyRecord', record.id, JSON.stringify(record));
            return result.toString() === 'true';
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
            // Try a simple query to check connectivity
            await this.contract.evaluateTransaction('ping');
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
            const result = await this.contract.evaluateTransaction('getNetworkStatus');
            const status = JSON.parse(result.toString());
            return {
                connected: true,
                blockHeight: status.blockHeight,
                networkId: status.networkId,
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
        if (this.gateway) {
            await this.gateway.disconnect();
            this.isInitialized = false;
            this.logger.log('Hyperledger Fabric client disconnected');
        }
    }
};
exports.HyperledgerFabricClient = HyperledgerFabricClient;
exports.HyperledgerFabricClient = HyperledgerFabricClient = HyperledgerFabricClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], HyperledgerFabricClient);
//# sourceMappingURL=hyperledger-fabric.client.js.map