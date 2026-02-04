import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';
import { ParcelEntity } from './entities/parcel.entity';
import { ParcelService } from './services/parcel.service';
import { SLAService } from './services/sla.service';
import { ParcelController } from './controllers/parcel.controller';
import { SLAController } from './controllers/sla.controller';

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
    TypeOrmModule.forFeature([ParcelEntity]),
  ],
  controllers: [ParcelController, SLAController],
  providers: [ParcelService, SLAService],
  exports: [ParcelService, SLAService],
})
export class AppModule {}