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
exports.CustomKPIEntity = void 0;
const typeorm_1 = require("typeorm");
const advanced_analytics_interfaces_1 = require("../interfaces/advanced-analytics.interfaces");
let CustomKPIEntity = class CustomKPIEntity {
    id;
    name;
    description;
    formula;
    unit;
    category;
    owner;
    target;
    updateFrequency;
    dataSource;
    isActive;
    lastCalculatedValue;
    lastCalculatedAt;
    metadata;
    createdAt;
    updatedAt;
};
exports.CustomKPIEntity = CustomKPIEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, unique: true }),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "formula", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_analytics_interfaces_1.KPICategory,
        default: advanced_analytics_interfaces_1.KPICategory.CUSTOM
    }),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], CustomKPIEntity.prototype, "target", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_analytics_interfaces_1.UpdateFrequency,
        default: advanced_analytics_interfaces_1.UpdateFrequency.DAILY
    }),
    __metadata("design:type", String)
], CustomKPIEntity.prototype, "updateFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array' }),
    __metadata("design:type", Array)
], CustomKPIEntity.prototype, "dataSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], CustomKPIEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], CustomKPIEntity.prototype, "lastCalculatedValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], CustomKPIEntity.prototype, "lastCalculatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], CustomKPIEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomKPIEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomKPIEntity.prototype, "updatedAt", void 0);
exports.CustomKPIEntity = CustomKPIEntity = __decorate([
    (0, typeorm_1.Entity)('custom_kpis'),
    (0, typeorm_1.Index)(['name']),
    (0, typeorm_1.Index)(['category']),
    (0, typeorm_1.Index)(['owner']),
    (0, typeorm_1.Index)(['isActive'])
], CustomKPIEntity);
//# sourceMappingURL=custom-kpi.entity.js.map