"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const shared_1 = require("@pdcp/shared");
const custody_record_entity_1 = require("./entities/custody-record.entity");
const custody_queue_entity_1 = require("./entities/custody-queue.entity");
const custody_service_1 = require("./services/custody.service");
const cryptography_service_1 = require("./services/cryptography.service");
const queue_manager_service_1 = require("./services/queue-manager.service");
const health_check_service_1 = require("./services/health-check.service");
const custody_controller_1 = require("./controllers/custody.controller");
const monitoring_controller_1 = require("./controllers/monitoring.controller");
const blockchain_client_factory_1 = require("./blockchain/blockchain-client.factory");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                ...(0, shared_1.getDatabaseConfig)(),
                entities: [custody_record_entity_1.CustodyRecordEntity, custody_queue_entity_1.CustodyQueueEntity],
                migrations: [__dirname + '/migrations/*{.ts,.js}'],
                migrationsRun: true,
            }),
            typeorm_1.TypeOrmModule.forFeature([custody_record_entity_1.CustodyRecordEntity, custody_queue_entity_1.CustodyQueueEntity]),
        ],
        controllers: [custody_controller_1.CustodyController, monitoring_controller_1.MonitoringController],
        providers: [
            custody_service_1.CustodyService,
            cryptography_service_1.CryptographyService,
            queue_manager_service_1.QueueManagerService,
            health_check_service_1.HealthCheckService,
            blockchain_client_factory_1.BlockchainClientFactory,
        ],
        exports: [custody_service_1.CustodyService, cryptography_service_1.CryptographyService, queue_manager_service_1.QueueManagerService, health_check_service_1.HealthCheckService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map