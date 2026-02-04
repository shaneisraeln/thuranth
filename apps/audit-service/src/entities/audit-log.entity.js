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
exports.AuditLogEntity = exports.AuditEventType = void 0;
const typeorm_1 = require("typeorm");
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["DECISION_MADE"] = "DECISION_MADE";
    AuditEventType["PARCEL_ASSIGNED"] = "PARCEL_ASSIGNED";
    AuditEventType["PARCEL_STATUS_CHANGED"] = "PARCEL_STATUS_CHANGED";
    AuditEventType["VEHICLE_LOCATION_UPDATED"] = "VEHICLE_LOCATION_UPDATED";
    AuditEventType["ROUTE_UPDATED"] = "ROUTE_UPDATED";
    AuditEventType["MANUAL_OVERRIDE"] = "MANUAL_OVERRIDE";
    AuditEventType["USER_LOGIN"] = "USER_LOGIN";
    AuditEventType["USER_LOGOUT"] = "USER_LOGOUT";
    AuditEventType["CUSTODY_TRANSFER"] = "CUSTODY_TRANSFER";
    AuditEventType["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    AuditEventType["SECURITY_EVENT"] = "SECURITY_EVENT";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
let AuditLogEntity = class AuditLogEntity {
    id;
    eventType;
    entityType;
    entityId;
    userId;
    eventData;
    ipAddress;
    userAgent;
    sessionId;
    serviceName;
    correlationId;
    dataHash;
    createdAt;
};
exports.AuditLogEntity = AuditLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditEventType,
        name: 'event_type',
    }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'entity_type', length: 50 }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'entity_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_data', type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], AuditLogEntity.prototype, "eventData", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'inet', nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "serviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlation_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_hash', length: 64, nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "dataHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AuditLogEntity.prototype, "createdAt", void 0);
exports.AuditLogEntity = AuditLogEntity = __decorate([
    (0, typeorm_1.Entity)('audit_logs'),
    (0, typeorm_1.Index)(['eventType']),
    (0, typeorm_1.Index)(['entityType', 'entityId']),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['serviceName']),
    (0, typeorm_1.Index)(['correlationId'])
], AuditLogEntity);
//# sourceMappingURL=audit-log.entity.js.map