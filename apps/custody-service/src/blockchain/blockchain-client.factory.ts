import { Injectable, Logger } from '@nestjs/common';
import { BlockchainClient, BlockchainConfig, BlockchainType } from './blockchain-client.interface';
import { HyperledgerFabricClient } from './hyperledger-fabric.client';
import { PolygonEdgeClient } from './polygon-edge.client';

@Injectable()
export class BlockchainClientFactory {
  private readonly logger = new Logger(BlockchainClientFactory.name);

  createClient(config: BlockchainConfig): BlockchainClient {
    this.logger.log(`Creating blockchain client for type: ${config.type}`);
    
    switch (config.type) {
      case BlockchainType.HYPERLEDGER_FABRIC:
        return new HyperledgerFabricClient(config);
      
      case BlockchainType.POLYGON_EDGE:
        return new PolygonEdgeClient(config);
      
      default:
        throw new Error(`Unsupported blockchain type: ${config.type}`);
    }
  }
}