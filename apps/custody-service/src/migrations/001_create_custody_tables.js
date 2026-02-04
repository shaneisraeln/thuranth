"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCustodyTables1700000000001 = void 0;
const typeorm_1 = require("typeorm");
class CreateCustodyTables1700000000001 {
    name = 'CreateCustodyTables1700000000001';
    async up(queryRunner) {
        // Create custody_records table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'custody_records',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'parcelId',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'fromParty',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'toParty',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'timestamp',
                    type: 'timestamp',
                    isNullable: false,
                },
                {
                    name: 'location',
                    type: 'jsonb',
                    isNullable: false,
                },
                {
                    name: 'digitalSignature',
                    type: 'text',
                    isNullable: false,
                },
                {
                    name: 'blockchainTxHash',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'verified',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'metadata',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create custody_queue table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'custody_queue',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'custodyTransfer',
                    type: 'jsonb',
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'enum',
                    enum: ['pending', 'processing', 'completed', 'failed'],
                    default: "'pending'",
                },
                {
                    name: 'retryCount',
                    type: 'integer',
                    default: 0,
                },
                {
                    name: 'blockchainTxHash',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'errorMessage',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'processedAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create indexes for custody_records
        await queryRunner.createIndex('custody_records', new typeorm_1.Index('IDX_custody_records_parcelId', ['parcelId']));
        await queryRunner.createIndex('custody_records', new typeorm_1.Index('IDX_custody_records_fromParty', ['fromParty']));
        await queryRunner.createIndex('custody_records', new typeorm_1.Index('IDX_custody_records_toParty', ['toParty']));
        await queryRunner.createIndex('custody_records', new typeorm_1.Index('IDX_custody_records_timestamp', ['timestamp']));
        await queryRunner.createIndex('custody_records', new typeorm_1.Index('IDX_custody_records_blockchainTxHash', ['blockchainTxHash']));
        // Create indexes for custody_queue
        await queryRunner.createIndex('custody_queue', new typeorm_1.Index('IDX_custody_queue_status', ['status']));
        await queryRunner.createIndex('custody_queue', new typeorm_1.Index('IDX_custody_queue_createdAt', ['createdAt']));
        await queryRunner.createIndex('custody_queue', new typeorm_1.Index('IDX_custody_queue_retryCount', ['retryCount']));
        await queryRunner.createIndex('custody_queue', new typeorm_1.Index('IDX_custody_queue_processedAt', ['processedAt']));
    }
    async down(queryRunner) {
        // Drop indexes
        await queryRunner.dropIndex('custody_queue', 'IDX_custody_queue_processedAt');
        await queryRunner.dropIndex('custody_queue', 'IDX_custody_queue_retryCount');
        await queryRunner.dropIndex('custody_queue', 'IDX_custody_queue_createdAt');
        await queryRunner.dropIndex('custody_queue', 'IDX_custody_queue_status');
        await queryRunner.dropIndex('custody_records', 'IDX_custody_records_blockchainTxHash');
        await queryRunner.dropIndex('custody_records', 'IDX_custody_records_timestamp');
        await queryRunner.dropIndex('custody_records', 'IDX_custody_records_toParty');
        await queryRunner.dropIndex('custody_records', 'IDX_custody_records_fromParty');
        await queryRunner.dropIndex('custody_records', 'IDX_custody_records_parcelId');
        // Drop tables
        await queryRunner.dropTable('custody_queue');
        await queryRunner.dropTable('custody_records');
    }
}
exports.CreateCustodyTables1700000000001 = CreateCustodyTables1700000000001;
//# sourceMappingURL=001_create_custody_tables.js.map