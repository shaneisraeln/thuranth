import { Controller, Post, Get, Param, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CustodyTransfer, CustodyRecord, CustodyChain } from '@pdcp/types';
import { CustodyService } from '../services/custody.service';

@ApiTags('custody')
@Controller('custody')
export class CustodyController {
  private readonly logger = new Logger(CustodyController.name);

  constructor(private readonly custodyService: CustodyService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'Record a custody transfer' })
  @ApiBody({ 
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
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 400, description: 'Invalid custody transfer data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async recordCustodyTransfer(@Body() transfer: CustodyTransfer): Promise<CustodyRecord> {
    try {
      this.logger.log(`Recording custody transfer for parcel ${transfer.parcelId}`);
      
      // Validate required fields
      if (!transfer.parcelId || !transfer.fromParty || !transfer.toParty || !transfer.signature) {
        throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
      }

      if (!transfer.location || typeof transfer.location.latitude !== 'number' || typeof transfer.location.longitude !== 'number') {
        throw new HttpException('Invalid location data', HttpStatus.BAD_REQUEST);
      }

      const result = await this.custodyService.recordCustodyTransfer(transfer);
      
      this.logger.log(`Custody transfer recorded successfully for parcel ${transfer.parcelId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to record custody transfer', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to record custody transfer',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('chain/:parcelId')
  @ApiOperation({ summary: 'Get custody chain for a parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel identifier' })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCustodyChain(@Param('parcelId') parcelId: string): Promise<CustodyChain> {
    try {
      this.logger.log(`Retrieving custody chain for parcel ${parcelId}`);
      
      if (!parcelId) {
        throw new HttpException('Parcel ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.custodyService.getCustodyChain(parcelId);
      
      if (!result || result.custodyRecords.length === 0) {
        throw new HttpException('Custody chain not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Custody chain retrieved for parcel ${parcelId} with ${result.custodyRecords.length} records`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get custody chain for parcel ${parcelId}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve custody chain',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('verify/:recordId')
  @ApiOperation({ summary: 'Verify a custody record' })
  @ApiParam({ name: 'recordId', description: 'Custody record identifier' })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async verifyCustodyRecord(@Param('recordId') recordId: string): Promise<{
    recordId: string;
    verified: boolean;
    timestamp: Date;
  }> {
    try {
      this.logger.log(`Verifying custody record ${recordId}`);
      
      if (!recordId) {
        throw new HttpException('Record ID is required', HttpStatus.BAD_REQUEST);
      }

      const verified = await this.custodyService.verifyCustodyRecord(recordId);
      
      const result = {
        recordId,
        verified,
        timestamp: new Date(),
      };

      this.logger.log(`Custody record ${recordId} verification result: ${verified}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to verify custody record ${recordId}`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to verify custody record',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process-queue')
  @ApiOperation({ summary: 'Process queued custody records' })
  @ApiResponse({ 
    status: 200, 
    description: 'Queue processing initiated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async processQueue(): Promise<{ message: string; timestamp: Date }> {
    try {
      this.logger.log('Processing custody record queue');
      
      await this.custodyService.processQueuedRecords();
      
      const result = {
        message: 'Queue processing completed successfully',
        timestamp: new Date(),
      };

      this.logger.log('Custody record queue processing completed');
      return result;
    } catch (error) {
      this.logger.error('Failed to process custody record queue', error);
      
      throw new HttpException(
        'Failed to process queue',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}