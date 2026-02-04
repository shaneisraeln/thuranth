"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BlockchainClientFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainClientFactory = void 0;
const common_1 = require("@nestjs/common");
const blockchain_client_interface_1 = require("./blockchain-client.interface");
const hyperledger_fabric_client_1 = require("./hyperledger-fabric.client");
const polygon_edge_client_1 = require("./polygon-edge.client");
let BlockchainClientFactory = BlockchainClientFactory_1 = class BlockchainClientFactory {
    logger = new common_1.Logger(BlockchainClientFactory_1.name);
    createClient(config) {
        this.logger.log(`Creating blockchain client for type: ${config.type}`);
        switch (config.type) {
            case blockchain_client_interface_1.BlockchainType.HYPERLEDGER_FABRIC:
                return new hyperledger_fabric_client_1.HyperledgerFabricClient(config);
            case blockchain_client_interface_1.BlockchainType.POLYGON_EDGE:
                return new polygon_edge_client_1.PolygonEdgeClient(config);
            default:
                throw new Error(`Unsupported blockchain type: ${config.type}`);
        }
    }
};
exports.BlockchainClientFactory = BlockchainClientFactory;
exports.BlockchainClientFactory = BlockchainClientFactory = BlockchainClientFactory_1 = __decorate([
    (0, common_1.Injectable)()
], BlockchainClientFactory);
//# sourceMappingURL=blockchain-client.factory.js.map