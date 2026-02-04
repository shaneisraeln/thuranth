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
exports.AnalyticsMetricEntity = void 0;
const typeorm_1 = require("typeorm");
let AnalyticsMetricEntity = class AnalyticsMetricEntity {
    id;
    metricName;
    metricType; // 'counter', 'gauge', 'histogram', 'summary'
    value;
    unit; // 'count', 'kg', 'km', 'minutes', 'percentage', etc.
    dimensions;
    periodStart;
    periodEnd;
    serviceName;
    calculatedAt;
    createdAt;
};
exports.AnalyticsMetricEntity = AnalyticsMetricEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnalyticsMetricEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metric_name', length: 100 }),
    __metadata("design:type", String)
], AnalyticsMetricEntity.prototype, "metricName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metric_type', length: 50 }),
    __metadata("design:type", String)
], AnalyticsMetricEntity.prototype, "metricType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4 }),
    __metadata("design:type", Number)
], AnalyticsMetricEntity.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], AnalyticsMetricEntity.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], AnalyticsMetricEntity.prototype, "dimensions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_start', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], AnalyticsMetricEntity.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_end', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], AnalyticsMetricEntity.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], AnalyticsMetricEntity.prototype, "serviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'calculated_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], AnalyticsMetricEntity.prototype, "calculatedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AnalyticsMetricEntity.prototype, "createdAt", void 0);
exports.AnalyticsMetricEntity = AnalyticsMetricEntity = __decorate([
    (0, typeorm_1.Entity)('analytics_metrics'),
    (0, typeorm_1.Index)(['metricName']),
    (0, typeorm_1.Index)(['metricType']),
    (0, typeorm_1.Index)(['periodStart', 'periodEnd']),
    (0, typeorm_1.Index)(['serviceName']),
    (0, typeorm_1.Index)(['calculatedAt'])
], AnalyticsMetricEntity);
//# sourceMappingURL=analytics-metric.entity.js.map