import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { CustodyRecord, CustodyTransfer } from '@pdcp/types';
import { BlockchainClient, BlockchainConfig } from './blockchain-client.interface';
import * as crypto from 'crypto';

// Smart contract ABI for custody operations
const CUSTODY_CONTRACT_ABI = [
  'function recordCustodyTransfer(string recordId, string custodyData) external returns (bool)',
  'function getCustodyChain(string parcelId) external view returns (string[])',
  'function verifyCustodyRecord(string recordId, string custodyData) external view returns (bool)',
  'function ping() external view returns (bool)',
  'function getNetworkStatus() external view returns (uint256, string)',
  'event CustodyTransferRecorded(string indexed parcelId, string recordId, address indexed recorder)',
];

@Injectable()
export class PolygonEdgeClient implements BlockchainClient {
  private readonly logger = new Logger(PolygonEdgeClient.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private isInitialized = false;

  constructor(private readonly config: BlockchainConfig) {}

  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Polygon Edge client...');
      
      // Create provider
      this.provider = new ethers.JsonRpcProvider(this.config.connectionString);
      
      // Create wallet if private key provided
      if (this.config.credentials?.privateKey) {
        this.wallet = new ethers.Wallet(this.config.credentials.privateKey, this.provider);
      } else {
        throw new Error('Private key required for Polygon Edge client');
      }

      // Create contract instance
      if (!this.config.contractAddress) {
        throw new Error('Contract address required for Polygon Edge client');
      }
      
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        CUSTODY_CONTRACT_ABI,
        this.wallet
      );

      // Test connection
      await this.provider.getNetwork();
      
      this.isInitialized = true;
      this.logger.log('Polygon Edge client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Polygon Edge client', error);
      throw error;
    }
  }

  async recordCustodyTransfer(transfer: CustodyTransfer): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Blockchain client not initialized');
    }

    try {
      const custodyRecord: Omit<CustodyRecord, 'id' | 'blockchainTxHash' | 'verified'> = {
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
    } catch (error) {
      this.logger.error('Failed to record custody transfer', error);
      throw error;
    }
  }

  async getCustodyChain(parcelId: string): Promise<CustodyRecord[]> {
    if (!this.isInitialized) {
      throw new Error('Blockchain client not initialized');
    }

    try {
      const result = await this.contract.getCustodyChain(parcelId);
      
      return result.map((recordData: string) => {
        const record = JSON.parse(recordData);
        return {
          ...record,
          timestamp: new Date(record.timestamp),
          verified: true,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get custody chain for parcel ${parcelId}`, error);
      throw error;
    }
  }

  async verifyCustodyRecord(record: CustodyRecord): Promise<boolean> {
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
    } catch (error) {
      this.logger.error(`Failed to verify custody record ${record.id}`, error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }
      
      // Try a simple call to check connectivity
      await this.contract.ping();
      return true;
    } catch (error) {
      this.logger.warn('Blockchain is not available', error);
      return false;
    }
  }

  async getNetworkStatus(): Promise<{
    connected: boolean;
    blockHeight?: number;
    networkId?: string;
  }> {
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
    } catch (error) {
      this.logger.error('Failed to get network status', error);
      return { connected: false };
    }
  }

  private generateRecordId(record: Omit<CustodyRecord, 'id' | 'blockchainTxHash' | 'verified'>): string {
    const data = `${record.parcelId}-${record.fromParty}-${record.toParty}-${record.timestamp.toISOString()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async disconnect(): Promise<void> {
    // Polygon Edge client doesn't need explicit disconnection
    this.isInitialized = false;
    this.logger.log('Polygon Edge client disconnected');
  }
}