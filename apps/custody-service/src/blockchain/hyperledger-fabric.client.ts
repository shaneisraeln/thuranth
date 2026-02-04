import { Injectable, Logger } from '@nestjs/common';
import { Gateway, Network, Contract, Wallet, Wallets } from 'fabric-network';
import { CustodyRecord, CustodyTransfer } from '@pdcp/types';
import { BlockchainClient, BlockchainConfig } from './blockchain-client.interface';
import * as crypto from 'crypto';

@Injectable()
export class HyperledgerFabricClient implements BlockchainClient {
  private readonly logger = new Logger(HyperledgerFabricClient.name);
  private gateway: Gateway;
  private network: Network;
  private contract: Contract;
  private wallet: Wallet;
  private isInitialized = false;

  constructor(private readonly config: BlockchainConfig) {}

  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Hyperledger Fabric client...');
      
      // Create wallet
      this.wallet = await Wallets.newInMemoryWallet();
      
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
      this.gateway = new Gateway();
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
    } catch (error) {
      this.logger.error('Failed to initialize Hyperledger Fabric client', error);
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
      
      const result = await this.contract.submitTransaction(
        'recordCustodyTransfer',
        recordId,
        JSON.stringify(custodyRecord)
      );

      const txId = result.toString();
      this.logger.log(`Custody transfer recorded with transaction ID: ${txId}`);
      
      return txId;
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
      const result = await this.contract.evaluateTransaction('getCustodyChain', parcelId);
      const records = JSON.parse(result.toString());
      
      return records.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
        verified: true,
      }));
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
      const result = await this.contract.evaluateTransaction(
        'verifyCustodyRecord',
        record.id,
        JSON.stringify(record)
      );
      
      return result.toString() === 'true';
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
      
      // Try a simple query to check connectivity
      await this.contract.evaluateTransaction('ping');
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

      const result = await this.contract.evaluateTransaction('getNetworkStatus');
      const status = JSON.parse(result.toString());
      
      return {
        connected: true,
        blockHeight: status.blockHeight,
        networkId: status.networkId,
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
    if (this.gateway) {
      await this.gateway.disconnect();
      this.isInitialized = false;
      this.logger.log('Hyperledger Fabric client disconnected');
    }
  }
}