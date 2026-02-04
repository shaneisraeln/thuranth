import { GeoCoordinate } from './common.types';

export interface CustodyRecord {
  id: string;
  parcelId: string;
  fromParty: string;
  toParty: string;
  timestamp: Date;
  location: GeoCoordinate;
  digitalSignature: string;
  blockchainTxHash?: string;
  verified: boolean;
  metadata?: Record<string, any>;
}

export interface CustodyTransfer {
  parcelId: string;
  fromParty: string;
  toParty: string;
  location: GeoCoordinate;
  signature: string;
  metadata?: Record<string, any>;
}

export interface CustodyChain {
  parcelId: string;
  custodyRecords: CustodyRecord[];
  chainHash: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}