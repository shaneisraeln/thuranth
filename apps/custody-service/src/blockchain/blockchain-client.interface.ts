import { CustodyRecord, CustodyTransfer } from '@pdcp/types';

export interface BlockchainClient {
  /**
   * Initialize the blockchain client connection
   */
  initialize(): Promise<void>;

  /**
   * Record a custody transfer on the blockchain
   */
  recordCustodyTransfer(transfer: CustodyTransfer): Promise<string>;

  /**
   * Retrieve custody records for a parcel
   */
  getCustodyChain(parcelId: string): Promise<CustodyRecord[]>;

  /**
   * Verify the integrity of a custody record
   */
  verifyCustodyRecord(record: CustodyRecord): Promise<boolean>;

  /**
   * Check if the blockchain is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the blockchain network status
   */
  getNetworkStatus(): Promise<{
    connected: boolean;
    blockHeight?: number;
    networkId?: string;
  }>;
}

export enum BlockchainType {
  HYPERLEDGER_FABRIC = 'hyperledger-fabric',
  POLYGON_EDGE = 'polygon-edge',
}

export interface BlockchainConfig {
  type: BlockchainType;
  connectionString: string;
  credentials?: {
    privateKey?: string;
    certificate?: string;
    mspId?: string;
  };
  contractAddress?: string;
  chaincodeName?: string;
}