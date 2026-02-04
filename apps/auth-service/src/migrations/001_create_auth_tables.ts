import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateAuthTables1700000001 implements MigrationInterface {
  name = 'CreateAuthTables1700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
          },
          {
            name: 'lastName',
            type: 'varchar',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'dispatcher', 'driver'],
            default: "'driver'",
          },
          {
            name: 'permissions',
            type: 'text',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastLogin',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'firebaseUid',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'failedLoginAttempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'lockedUntil',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create security_events table
    await queryRunner.createTable(
      new Table({
        name: 'security_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'login_success',
              'login_failure',
              'logout',
              'token_refresh',
              'unauthorized_access',
              'permission_denied',
              'suspicious_activity',
              'password_change',
              'account_locked',
            ],
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'details',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'low'",
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_email', ['email'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_role', ['role'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_firebase_uid', ['firebaseUid'])
    );

    await queryRunner.createIndex(
      'security_events',
      new Index('IDX_security_events_type', ['type'])
    );

    await queryRunner.createIndex(
      'security_events',
      new Index('IDX_security_events_severity', ['severity'])
    );

    await queryRunner.createIndex(
      'security_events',
      new Index('IDX_security_events_timestamp', ['timestamp'])
    );

    await queryRunner.createIndex(
      'security_events',
      new Index('IDX_security_events_user_id', ['userId'])
    );

    await queryRunner.createIndex(
      'security_events',
      new Index('IDX_security_events_ip_address', ['ipAddress'])
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('security_events');
    await queryRunner.dropTable('users');
  }
}