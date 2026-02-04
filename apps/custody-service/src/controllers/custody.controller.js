"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CustodyController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustodyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const custody_service_1 = require("../services/custody.service");
let CustodyController = CustodyController_1 = class CustodyController {
    custodyService;
    logger = new common_1.Logger(CustodyController_1.name);
    constructor(custodyService) {
        this.custodyService = custodyService;
    }
    async recordCustodyTransfer(transfer) {
        try {
            this.logger.log(`Recording custody transfer for parcel ${transfer.parcelId}`);
            // Validate required fields
            if (!transfer.parcelId || !transfer.fromParty || !transfer.toParty || !transfer.signature) {
                throw new common_1.HttpException('Missing required fields', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!transfer.location || typeof transfer.location.latitude !== 'number' || typeof transfer.location.longitude !== 'number') {
                throw new common_1.HttpException('Invalid location data', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.custodyService.recordCustodyTransfer(transfer);
            this.logger.log(`Custody transfer recorded successfully for parcel ${transfer.parcelId}`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to record custody transfer', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to record custody transfer', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCustodyChain(parcelId) {
        try {
            this.logger.log(`Retrieving custody chain for parcel ${parcelId}`);
            if (!parcelId) {
                throw new common_1.HttpException('Parcel ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.custodyService.getCustodyChain(parcelId);
            if (!result || result.custodyRecords.length === 0) {
                throw new common_1.HttpException('Custody chain not found', common_1.HttpStatus.NOT_FOUND);
            }
            this.logger.log(`Custody chain retrieved for parcel ${parcelId} with ${result.custodyRecords.length} records`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to get custody chain for parcel ${parcelId}`, error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to retrieve custody chain', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async verifyCustodyRecord(recordId) {
        try {
            this.logger.log(`Verifying custody record ${recordId}`);
            if (!recordId) {
                throw new common_1.HttpException('Record ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const verified = await this.custodyService.verifyCustodyRecord(recordId);
            const result = {
                recordId,
                verified,
                timestamp: new Date(),
            };
            this.logger.log(`Custody record ${recordId} verification result: ${verified}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to verify custody record ${recordId}`, error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to verify custody record', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async processQueue() {
        try {
            this.logger.log('Processing custody record queue');
            await this.custodyService.processQueuedRecords();
            const result = {
                message: 'Queue processing completed successfully',
                timestamp: new Date(),
            };
            this.logger.log('Custody record queue processing completed');
            return result;
        }
        catch (error) {
            this.logger.error('Failed to process custody record queue', error);
            throw new common_1.HttpException('Failed to process queue', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.CustodyController = CustodyController;
__decorate([
    (0, common_1.Post)('transfer'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a custody transfer' }),
    (0, swagger_1.ApiBody)({
        description: 'Custody transfer details',
        schema: {
            type: 'object',
            properties: {
                parcelId: { type: 'string', description: 'Parcel identifier' },
                fromParty: { type: 'string', description: 'Current custody holder' },
                toParty: { type: 'string', description: 'New custody holder' },
                location: {
                    type: 'object',
                    properties: {
                        latitude: { type: 'number' },
                        longitude: { type: 'number' }
                    }
                },
                signature: { type: 'string', description: 'Digital signature' },
                metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['parcelId', 'fromParty', 'toParty', 'location', 'signature']
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Custody transfer recorded successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                parcelId: { type: 'string' },
                fromParty: { type: 'string' },
                toParty: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                location: { type: 'object' },
                digitalSignature: { type: 'string' },
                blockchainTxHash: { type: 'string' },
                verified: { type: 'boolean' },
                metadata: { type: 'object' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid custody transfer data' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "recordCustodyTransfer", null);
__decorate([
    (0, common_1.Get)('chain/:parcelId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get custody chain for a parcel' }),
    (0, swagger_1.ApiParam)({ name: 'parcelId', description: 'Parcel identifier' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Custody chain retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                parcelId: { type: 'string' },
                custodyRecords: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            parcelId: { type: 'string' },
                            fromParty: { type: 'string' },
                            toParty: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                            location: { type: 'object' },
                            digitalSignature: { type: 'string' },
                            blockchainTxHash: { type: 'string' },
                            verified: { type: 'boolean' },
                            metadata: { type: 'object' }
                        }
                    }
                },
                chainHash: { type: 'string' },
                verified: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Parcel not found' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Param)('parcelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "getCustodyChain", null);
__decorate([
    (0, common_1.Get)('verify/:recordId'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify a custody record' }),
    (0, swagger_1.ApiParam)({ name: 'recordId', description: 'Custody record identifier' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Custody record verification result',
        schema: {
            type: 'object',
            properties: {
                recordId: { type: 'string' },
                verified: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Record not found' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Param)('recordId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "verifyCustodyRecord", null);
__decorate([
    (0, common_1.Post)('process-queue'),
    (0, swagger_1.ApiOperation)({ summary: 'Process queued custody records' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Queue processing initiated',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "processQueue", null);
exports.CustodyController = CustodyController = CustodyController_1 = __decorate([
    (0, swagger_1.ApiTags)('custody'),
    (0, common_1.Controller)('custody'),
    __metadata("design:paramtypes", [custody_service_1.CustodyService])
], CustodyController);
//# sourceMappingURL=custody.controller.js.map