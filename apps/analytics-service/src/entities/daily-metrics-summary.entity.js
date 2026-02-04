"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyMetricsSummaryEntity = void 0;
const typeorm_1 = require("typeorm");
let DailyMetricsSummaryEntity = class DailyMetricsSummaryEntity {
    id;
    date;
    // Primary metrics
    vehiclesAvoided;
    totalParcelsProcessed;
    successfulConsolidations;
    consolidationRate; // percentage
    // Utilization metrics
    avgVehicleUtilization; // percentage
    totalDistanceSaved; // km
    totalFuelSaved; // liters
    // Environmental impact
    co2EmissionsSaved; // kg
    // SLA metrics
    slaAdherenceRate; // percentage
    avgDeliveryTime; // minutes
    // Decision engine metrics
    avgDecisionTime; // milliseconds
    shadowModeAccuracy; // percentage
    manualOverrideRate; // percentage
    createdAt;
    updatedAt;
};
exports.DailyMetricsSummaryEntity = DailyMetricsSummaryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DailyMetricsSummaryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], DailyMetricsSummaryEntity.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vehicles_avoided', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "vehiclesAvoided", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_parcels_processed', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "totalParcelsProcessed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'successful_consolidations', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "successfulConsolidations", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consolidation_rate', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "consolidationRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_vehicle_utilization', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "avgVehicleUtilization", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_distance_saved', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "totalDistanceSaved", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_fuel_saved', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "totalFuelSaved", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'co2_emissions_saved', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "co2EmissionsSaved", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sla_adherence_rate', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "slaAdherenceRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_delivery_time', type: 'decimal', precision: 8, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "avgDeliveryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_decision_time', type: 'decimal', precision: 8, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "avgDecisionTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shadow_mode_accuracy', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "shadowModeAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'manual_override_rate', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DailyMetricsSummaryEntity.prototype, "manualOverrideRate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], DailyMetricsSummaryEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], DailyMetricsSummaryEntity.prototype, "updatedAt", void 0);
exports.DailyMetricsSummaryEntity = DailyMetricsSummaryEntity = __decorate([
    (0, typeorm_1.Entity)('daily_metrics_summary'),
    (0, typeorm_1.Unique)(['date']),
    (0, typeorm_1.Index)(['date']),
    (0, typeorm_1.Index)(['consolidationRate']),
    (0, typeorm_1.Index)(['avgVehicleUtilization'])
], DailyMetricsSummaryEntity);
//# sourceMappingURL=daily-metrics-summary.entity.js.map