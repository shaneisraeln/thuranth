import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';
import { CustodyRecordEntity } from './entities/custody-record.entity';
import { CustodyQueueEntity } from './entities/custody-queue.entity';
import { CustodyService } from './services/custody.service';
import { CryptographyService } from './services/cryptography.service';
import { QueueManagerService } from './services/queue-manager.service';
import { HealthCheckService } from './services/health-check.service';
import { CustodyController } from './controllers/custody.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { BlockchainClientFactory } from './blockchain/blockchain-client.factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      entities: [CustodyRecordEntity, CustodyQueueEntity],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([CustodyRecordEntity, CustodyQueueEntity]),
  ],
  controllers: [CustodyController, MonitoringController],
  providers: [
    CustodyService,
    CryptographyService,
    QueueManagerService,
    HealthCheckService,
    BlockchainClientFactory,
  ],
  exports: [CustodyService, CryptographyService, QueueManagerService, HealthCheckService],
})
export class AppModule {}