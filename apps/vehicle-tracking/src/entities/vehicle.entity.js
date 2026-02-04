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
exports.VehicleEntity = void 0;
const typeorm_1 = require("typeorm");
let VehicleEntity = class VehicleEntity {
    id;
    registrationNumber;
    type;
    driverId;
    capacity;
    currentLocation;
    currentRoute;
    status;
    eligibilityScore;
    lastUpdated;
    createdAt;
    updatedAt;
};
exports.VehicleEntity = VehicleEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VehicleEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], VehicleEntity.prototype, "registrationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['2W', '4W'],
    }),
    __metadata("design:type", String)
], VehicleEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], VehicleEntity.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], VehicleEntity.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], VehicleEntity.prototype, "currentLocation", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: [] }),
    __metadata("design:type", Array)
], VehicleEntity.prototype, "currentRoute", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['AVAILABLE', 'ON_ROUTE', 'OFFLINE', 'MAINTENANCE'],
        default: 'AVAILABLE',
    }),
    __metadata("design:type", String)
], VehicleEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], VehicleEntity.prototype, "eligibilityScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], VehicleEntity.prototype, "lastUpdated", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VehicleEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VehicleEntity.prototype, "updatedAt", void 0);
exports.VehicleEntity = VehicleEntity = __decorate([
    (0, typeorm_1.Entity)('vehicles'),
    (0, typeorm_1.Index)(['status', 'type']),
    (0, typeorm_1.Index)(['currentLocation'])
], VehicleEntity);
//# sourceMappingURL=vehicle.entity.js.map