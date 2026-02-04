import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CustodyRecord, CustodyTransfer } from '@pdcp/types';

export interface DigitalSignatureData {
  parcelId: string;
  fromParty: string;
  toParty: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
}

@Injectable()
export class CryptographyService {
  private readonly logger = new Logger(CryptographyService.name);

  /**
   * Generate a digital signature for custody transfer data
   */
  generateDigitalSignature(data: DigitalSignatureData, privateKey?: string): string {
    try {
      // Create canonical string representation of the data
      const canonicalData = this.createCanonicalString(data);
      
      if (privateKey) {
        // Use provided private key for signing
        const sign = crypto.createSign('SHA256');
        sign.update(canonicalData);
        return sign.sign(privateKey, 'hex');
      } else {
        // Fallback to HMAC-based signature (for demo purposes)
        const secret = process.env.CUSTODY_SIGNATURE_SECRET || 'default-secret-key';
        return crypto.createHmac('sha256', secret).update(canonicalData).digest('hex');
      }
    } catch (error) {
      this.logger.error('Failed to generate digital signature', error);
      throw new Error('Failed to generate digital signature');
    }
  }

  /**
   * Verify a digital signature
   */
  verifyDigitalSignature(
    data: DigitalSignatureData,
    signature: string,
    publicKey?: string
  ): boolean {
    try {
      const canonicalData = this.createCanonicalString(data);
      
      if (publicKey) {
        // Use provided public key for verification
        const verify = crypto.createVerify('SHA256');
        verify.update(canonicalData);
        return verify.verify(publicKey, signature, 'hex');
      } else {
        // Fallback to HMAC-based verification
        const secret = process.env.CUSTODY_SIGNATURE_SECRET || 'default-secret-key';
        const expectedSignature = crypto.createHmac('sha256', secret).update(canonicalData).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
      }
    } catch (error) {
      this.logger.error('Failed to verify digital signature', error);
      return false;
    }
  }

  /**
   * Calculate hash for a custody record
   */
  calculateRecordHash(record: CustodyRecord): string {
    try {
      const data: DigitalSignatureData = {
        parcelId: record.parcelId,
        fromParty: record.fromParty,
        toParty: record.toParty,
        timestamp: record.timestamp.toISOString(),
        location: record.location,
        metadata: record.metadata,
      };
      
      const canonicalData = this.createCanonicalString(data);
      return crypto.createHash('sha256').update(canonicalData).digest('hex');
    } catch (error) {
      this.logger.error('Failed to calculate record hash', error);
      throw new Error('Failed to calculate record hash');
    }
  }

  /**
   * Calculate hash for an entire custody chain
   */
  calculateChainHash(records: CustodyRecord[]): string {
    try {
      if (records.length === 0) {
        return crypto.createHash('sha256').update('empty-chain').digest('hex');
      }

      // Sort records by timestamp to ensure consistent ordering
      const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Create chain data by concatenating record hashes
      const chainData = sortedRecords
        .map(record => this.calculateRecordHash(record))
        .join('|');
      
      return crypto.createHash('sha256').update(chainData).digest('hex');
    } catch (error) {
      this.logger.error('Failed to calculate chain hash', error);
      throw new Error('Failed to calculate chain hash');
    }
  }

  /**
   * Verify the integrity of a custody chain
   */
  verifyChainIntegrity(records: CustodyRecord[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      if (records.length === 0) {
        return { valid: true, errors: [] };
      }

      // Sort records by timestamp
      const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Check chronological order
      for (let i = 1; i < sortedRecords.length; i++) {
        if (sortedRecords[i].timestamp <= sortedRecords[i - 1].timestamp) {
          errors.push(`Record ${i} timestamp is not after previous record`);
        }
      }

      // Check custody chain continuity
      for (let i = 1; i < sortedRecords.length; i++) {
        if (sortedRecords[i].fromParty !== sortedRecords[i - 1].toParty) {
          errors.push(`Custody chain break between records ${i - 1} and ${i}: ${sortedRecords[i - 1].toParty} -> ${sortedRecords[i].fromParty}`);
        }
      }

      // Verify digital signatures
      for (let i = 0; i < sortedRecords.length; i++) {
        const record = sortedRecords[i];
        const signatureData: DigitalSignatureData = {
          parcelId: record.parcelId,
          fromParty: record.fromParty,
          toParty: record.toParty,
          timestamp: record.timestamp.toISOString(),
          location: record.location,
          metadata: record.metadata,
        };

        if (!this.verifyDigitalSignature(signatureData, record.digitalSignature)) {
          errors.push(`Invalid digital signature for record ${i}`);
        }
      }

      // Check for duplicate records
      const recordHashes = new Set<string>();
      for (let i = 0; i < sortedRecords.length; i++) {
        const hash = this.calculateRecordHash(sortedRecords[i]);
        if (recordHashes.has(hash)) {
          errors.push(`Duplicate record detected at position ${i}`);
        }
        recordHashes.add(hash);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Failed to verify chain integrity', error);
      return {
        valid: false,
        errors: [`Verification failed: ${error.message}`],
      };
    }
  }

  /**
   * Generate a unique record ID based on custody transfer data
   */
  generateRecordId(transfer: CustodyTransfer, timestamp: Date): string {
    try {
      const data = `${transfer.parcelId}-${transfer.fromParty}-${transfer.toParty}-${timestamp.toISOString()}`;
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.logger.error('Failed to generate record ID', error);
      throw new Error('Failed to generate record ID');
    }
  }

  /**
   * Create a canonical string representation of signature data
   */
  private createCanonicalString(data: DigitalSignatureData): string {
    // Create a deterministic string representation
    const canonical = {
      parcelId: data.parcelId,
      fromParty: data.fromParty,
      toParty: data.toParty,
      timestamp: data.timestamp,
      location: {
        latitude: Number(data.location.latitude.toFixed(6)), // Normalize precision
        longitude: Number(data.location.longitude.toFixed(6)),
      },
      metadata: data.metadata ? this.sortObjectKeys(data.metadata) : undefined,
    };

    return JSON.stringify(canonical);
  }

  /**
   * Recursively sort object keys for deterministic serialization
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sortedObj: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sortedObj[key] = this.sortObjectKeys(obj[key]);
      });

    return sortedObj;
  }
}