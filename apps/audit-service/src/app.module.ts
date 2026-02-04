import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLoggerService } from './services/audit-logger.service';
import { AuditController } from './controllers/audit.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([AuditLogEntity]),
  ],
  controllers: [AuditController],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AppModule {}