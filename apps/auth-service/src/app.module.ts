import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { SecurityMonitoringController } from './controllers/security-monitoring.controller';
import { AlertingController } from './controllers/alerting.controller';
import { JwtAuthService } from './services/jwt-auth.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { SecurityLoggerService } from './services/security-logger.service';
import { RolePermissionService } from './services/role-permission.service';
import { AlertingService } from './services/alerting.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FirebaseStrategy } from './strategies/firebase.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SensitiveOperationGuard } from './guards/sensitive-operation.guard';
import { User } from './entities/user.entity';
import { SecurityEvent } from './entities/security-event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'pdcp_auth'),
        entities: [User, SecurityEvent],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, SecurityEvent]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UserManagementController, SecurityMonitoringController, AlertingController],
  providers: [
    JwtAuthService,
    FirebaseAuthService,
    SecurityLoggerService,
    RolePermissionService,
    AlertingService,
    JwtStrategy,
    FirebaseStrategy,
    JwtAuthGuard,
    FirebaseAuthGuard,
    RolesGuard,
    PermissionsGuard,
    SensitiveOperationGuard,
  ],
  exports: [
    JwtAuthService,
    FirebaseAuthService,
    SecurityLoggerService,
    RolePermissionService,
    AlertingService,
    JwtAuthGuard,
    FirebaseAuthGuard,
    RolesGuard,
    PermissionsGuard,
    SensitiveOperationGuard,
  ],
})
export class AppModule {}