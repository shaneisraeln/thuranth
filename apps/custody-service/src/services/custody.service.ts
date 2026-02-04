import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CustodyRecord, CustodyTransfer, CustodyChain } from '@pdcp/types';
import { BlockchainClient, BlockchainConfig, BlockchainType } from '../blockchain/blockchain-client.interface';
import { BlockchainClientFactory } from '../blockchain/blockchain-client.factory';
import { CustodyRecordEntity } from '../entities/custody-record.entity';
import { CustodyQueueEntity, QueueStatus } from '../entities/custody-queue.entity';
import { CryptographyService, DigitalSignatureData } from './cryptography.service';
import * as crypto from 'crypto';

@Injectable()
export class CustodyService implements OnModuleInit {
  private readonly logger = new Logger(CustodyService.name);
  private blockchainClient: BlockchainClient;

  constructor(
    @InjectRepository(CustodyRecordEntity)
    private readonly custodyRecordRepository: Repository<CustodyRecordEntity>,
    @InjectRepository(CustodyQueueEntity)
    private readonly custodyQueueRepository: Repository<CustodyQueueEntity>,
    private readonly blockchainClientFactory: BlockchainClientFactory,
    private readonly configService: ConfigService,
    private readonly cryptographyService: CryptographyService,
  ) {}

  async onModuleInit() {
    await this.initializeBlockchainClient();
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
      
      this.logger.log('Blockchain client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize blockchain client', error);
      // Continue without blockchain - will use offline mode
    }
  }

  async recordCustodyTransfer(transfer: CustodyTransfer): Promise<CustodyRecord> {
    this.logger.log(`Recording custody transfer for parcel ${transfer.parcelId}`);

    try {
      // Validate and enhance the transfer with proper signature if needed
      const enhancedTransfer = await this.validateAndEnhanceTransfer(transfer);
      
      // Check if blockchain is available
      const isBlockchainAvailable = await this.isBlockchainAvailable();
      
      if (isBlockchainAvailable) {
        // Record directly to blockchain
        const txHash = await this.blockchainClient.recordCustodyTransfer(enhancedTransfer);
        
        // Create custody record
        const custodyRecord = await this.createCustodyRecord(enhancedTransfer, txHash, true);
        
        this.logger.log(`Custody transfer recorded on blockchain with tx: ${txHash}`);
        return custodyRecord;
      } else {
        // Queue for later processing
        await this.queueCustodyTransfer(enhancedTransfer);
        
        // Create custody record without blockchain verification
        const custodyRecord = await this.createCustodyRecord(enhancedTransfer, undefined, false);
        
        this.logger.log(`Custody transfer queued for later blockchain recording`);
        return custodyRecord;
      }
    } catch (error) {
      this.logger.error('Failed to record custody transfer', error);
      
      // Fallback to queuing
      await this.queueCustodyTransfer(transfer);
      const custodyRecord = await this.createCustodyRecord(transfer, undefined, false);
      
      throw error;
    }
  }

  async getCustodyChain(parcelId: string): Promise<CustodyChain> {
    this.logger.log(`Retrieving custody chain for parcel ${parcelId}`);

    try {
      // Try to get from blockchain first
      let blockchainRecords: CustodyRecord[] = [];
      const isBlockchainAvailable = await this.isBlockchainAvailable();
      
      if (isBlockchainAvailable) {
        try {
          blockchainRecords = await this.blockchainClient.getCustodyChain(parcelId);
        } catch (error) {
          this.logger.warn(`Failed to get custody chain from blockchain for parcel ${parcelId}`, error);
        }
      }

      // Get from local database
      const localRecords = await this.custodyRecordRepository.find({
        where: { parcelId },
        order: { timestamp: 'ASC' },
      });

      // Merge and deduplicate records
      const allRecords = this.mergeAndDeduplicateRecords(blockchainRecords, localRecords);
      
      // Calculate chain hash using cryptography service
      const chainHash = this.cryptographyService.calculateChainHash(allRecords);
      
      // Verify chain integrity using cryptography service
      const integrityResult = this.cryptographyService.verifyChainIntegrity(allRecords);
      const verified = integrityResult.valid;
      
      if (!verified) {
        this.logger.warn(`Chain integrity issues for parcel ${parcelId}:`, integrityResult.errors);
      }

      const custodyChain: CustodyChain = {
        parcelId,
        custodyRecords: allRecords,
        chainHash,
        verified,
        createdAt: allRecords.length > 0 ? allRecords[0].timestamp : new Date(),
        updatedAt: allRecords.length > 0 ? allRecords[allRecords.length - 1].timestamp : new Date(),
      };

      this.logger.log(`Retrieved custody chain for parcel ${parcelId} with ${allRecords.length} records`);
      return custodyChain;
    } catch (error) {
      this.logger.error(`Failed to get custody chain for parcel ${parcelId}`, error);
      throw error;
    }
  }

  async verifyCustodyRecord(recordId: string): Promise<boolean> {
    try {
      const record = await this.custodyRecordRepository.findOne({ where: { id: recordId } });
      if (!record) {
        return false;
      }

      // Verify with blockchain if available
      const isBlockchainAvailable = await this.isBlockchainAvailable();
      if (isBlockchainAvailable && record.blockchainTxHash) {
        const blockchainVerified = await this.blockchainClient.verifyCustodyRecord(record);
        if (!blockchainVerified) {
          return false;
        }
      }

      // Verify digital signature using cryptography service
      const signatureData: DigitalSignatureData = {
        parcelId: record.parcelId,
        fromParty: record.fromParty,
        toParty: record.toParty,
        timestamp: record.timestamp.toISOString(),
        location: record.location,
        metadata: record.metadata,
      };

      return this.cryptographyService.verifyDigitalSignature(signatureData, record.digitalSignature);
    } catch (error) {
      this.logger.error(`Failed to verify custody record ${recordId}`, error);
      return false;
    }
  }

  async processQueuedRecords(): Promise<void> {
    this.logger.log('Processing queued custody records...');
    // Delegate to queue manager service
    // This method is kept for backward compatibility
    // The actual processing is now handled by QueueManagerService automatically
    this.logger.log('Queue processing is handled automatically by QueueManagerService');
  }

  private async createCustodyRecord(
    transfer: CustodyTransfer,
    blockchainTxHash?: string,
    verified: boolean = false,
  ): Promise<CustodyRecord> {
    const timestamp = new Date();
    
    const custodyRecord = this.custodyRecordRepository.create({
      id: this.cryptographyService.generateRecordId(transfer, timestamp),
      parcelId: transfer.parcelId,
      fromParty: transfer.fromParty,
      toParty: transfer.toParty,
      timestamp,
      location: transfer.location,
      digitalSignature: transfer.signature,
      blockchainTxHash,
      verified,
      metadata: transfer.metadata,
    });

    return await this.custodyRecordRepository.save(custodyRecord);
  }

  private async validateAndEnhanceTransfer(transfer: CustodyTransfer): Promise<CustodyTransfer> {
    // Validate basic fields
    if (!transfer.parcelId || !transfer.fromParty || !transfer.toParty) {
      throw new Error('Missing required fields in custody transfer');
    }

    if (!transfer.location || typeof transfer.location.latitude !== 'number' || typeof transfer.location.longitude !== 'number') {
      throw new Error('Invalid location data in custody transfer');
    }

    // Validate custody chain continuity
    await this.validateCustodyChainContinuity(transfer);

    // Generate or validate digital signature
    if (!transfer.signature) {
      const signatureData: DigitalSignatureData = {
        parcelId: transfer.parcelId,
        fromParty: transfer.fromParty,
        toParty: transfer.toParty,
        timestamp: new Date().toISOString(),
        location: transfer.location,
        metadata: transfer.metadata,
      };
      
      transfer.signature = this.cryptographyService.generateDigitalSignature(signatureData);
      this.logger.log(`Generated digital signature for custody transfer`);
    } else {
      // Verify provided signature
      const signatureData: DigitalSignatureData = {
        parcelId: transfer.parcelId,
        fromParty: transfer.fromParty,
        toParty: transfer.toParty,
        timestamp: new Date().toISOString(),
        location: transfer.location,
        metadata: transfer.metadata,
      };
      
      const isValidSignature = this.cryptographyService.verifyDigitalSignature(signatureData, transfer.signature);
      if (!isValidSignature) {
        this.logger.warn('Invalid digital signature provided, generating new one');
        transfer.signature = this.cryptographyService.generateDigitalSignature(signatureData);
      }
    }

    return transfer;
  }

  private async validateCustodyChainContinuity(transfer: CustodyTransfer): Promise<void> {
    try {
      // Get the latest custody record for this parcel
      const latestRecord = await this.custodyRecordRepository.findOne({
        where: { parcelId: transfer.parcelId },
        order: { timestamp: 'DESC' },
      });

      if (latestRecord) {
        // Check if the fromParty matches the latest toParty
        if (latestRecord.toParty !== transfer.fromParty) {
          this.logger.warn(
            `Custody chain continuity warning for parcel ${transfer.parcelId}: ` +
            `latest holder is ${latestRecord.toParty}, but transfer is from ${transfer.fromParty}`
          );
          // Note: This is a warning, not an error, as there might be legitimate reasons for this
        }
      }
    } catch (error) {
      this.logger.error('Failed to validate custody chain continuity', error);
      // Don't throw error here as this is a validation warning
    }
  }

  private async queueCustodyTransfer(transfer: CustodyTransfer): Promise<void> {
    const queueEntry = this.custodyQueueRepository.create({
      custodyTransfer: transfer,
      status: QueueStatus.PENDING,
    });

    await this.custodyQueueRepository.save(queueEntry);
  }

  private async processQueuedRecord(queuedRecord: CustodyQueueEntity): Promise<void> {
    try {
      // Update status to processing
      queuedRecord.status = QueueStatus.PROCESSING;
      await this.custodyQueueRepository.save(queuedRecord);

      // Check if blockchain is available
      const isBlockchainAvailable = await this.isBlockchainAvailable();
      if (!isBlockchainAvailable) {
        this.logger.warn('Blockchain still not available, skipping queued record processing');
        queuedRecord.status = QueueStatus.PENDING;
        await this.custodyQueueRepository.save(queuedRecord);
        return;
      }

      // Validate and enhance the transfer
      const enhancedTransfer = await this.validateAndEnhanceTransfer(queuedRecord.custodyTransfer);

      // Record to blockchain
      const txHash = await this.blockchainClient.recordCustodyTransfer(enhancedTransfer);
      
      // Update local record with blockchain hash
      await this.custodyRecordRepository.update(
        { parcelId: queuedRecord.custodyTransfer.parcelId },
        { blockchainTxHash: txHash, verified: true }
      );

      // Mark as completed
      queuedRecord.status = QueueStatus.COMPLETED;
      queuedRecord.blockchainTxHash = txHash;
      queuedRecord.processedAt = new Date();
      await this.custodyQueueRepository.save(queuedRecord);

      this.logger.log(`Successfully processed queued record with tx: ${txHash}`);
    } catch (error) {
      this.logger.error('Failed to process queued record', error);
      
      queuedRecord.status = QueueStatus.FAILED;
      queuedRecord.errorMessage = error.message;
      queuedRecord.retryCount += 1;
      await this.custodyQueueRepository.save(queuedRecord);
    }
  }

  private async isBlockchainAvailable(): Promise<boolean> {
    if (!this.blockchainClient) {
      return false;
    }

    try {
      return await this.blockchainClient.isAvailable();
    } catch (error) {
      return false;
    }
  }

  private mergeAndDeduplicateRecords(
    blockchainRecords: CustodyRecord[],
    localRecords: CustodyRecordEntity[],
  ): CustodyRecord[] {
    const recordMap = new Map<string, CustodyRecord>();

    // Add blockchain records (higher priority)
    blockchainRecords.forEach(record => {
      const key = this.cryptographyService.calculateRecordHash(record);
      recordMap.set(key, record);
    });

    // Add local records if not already present
    localRecords.forEach(record => {
      const key = this.cryptographyService.calculateRecordHash(record);
      if (!recordMap.has(key)) {
        recordMap.set(key, record);
      }
    });

    return Array.from(recordMap.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}