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
const analytics_metric_entity_1 = require("./entities/analytics-metric.entity");
const daily_metrics_summary_entity_1 = require("./entities/daily-metrics-summary.entity");
const custom_kpi_entity_1 = require("./entities/custom-kpi.entity");
const metrics_calculator_service_1 = require("./services/metrics-calculator.service");
const reporting_service_1 = require("./services/reporting.service");
const advanced_analytics_service_1 = require("./services/advanced-analytics.service");
const custom_kpi_service_1 = require("./services/custom-kpi.service");
const analytics_controller_1 = require("./controllers/analytics.controller");
const reporting_controller_1 = require("./controllers/reporting.controller");
const advanced_analytics_controller_1 = require("./controllers/advanced-analytics.controller");
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
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                migrations: [__dirname + '/migrations/*{.ts,.js}'],
                migrationsRun: true,
            }),
            typeorm_1.TypeOrmModule.forFeature([analytics_metric_entity_1.AnalyticsMetricEntity, daily_metrics_summary_entity_1.DailyMetricsSummaryEntity, custom_kpi_entity_1.CustomKPIEntity]),
        ],
        controllers: [analytics_controller_1.AnalyticsController, reporting_controller_1.ReportingController, advanced_analytics_controller_1.AdvancedAnalyticsController],
        providers: [metrics_calculator_service_1.MetricsCalculatorService, reporting_service_1.ReportingService, advanced_analytics_service_1.AdvancedAnalyticsService, custom_kpi_service_1.CustomKPIService],
        exports: [metrics_calculator_service_1.MetricsCalculatorService, reporting_service_1.ReportingService, advanced_analytics_service_1.AdvancedAnalyticsService, custom_kpi_service_1.CustomKPIService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map