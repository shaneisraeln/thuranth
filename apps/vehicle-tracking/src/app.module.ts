import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';
import { VehicleEntity } from './entities/vehicle.entity';
import { VehicleController } from './controllers/vehicle.controller';
import { VehicleService } from './services/vehicle.service';
import { CapacityController, CapacityStatsController } from './controllers/capacity.controller';
import { CapacityService } from './services/capacity.service';
import { VehicleTrackingGateway } from './gateways/vehicle-tracking.gateway';

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
    TypeOrmModule.forFeature([VehicleEntity]),
  ],
  controllers: [VehicleController, CapacityController, CapacityStatsController],
  providers: [VehicleService, CapacityService, VehicleTrackingGateway],
  exports: [VehicleService, CapacityService, VehicleTrackingGateway],
})
export class AppModule {}