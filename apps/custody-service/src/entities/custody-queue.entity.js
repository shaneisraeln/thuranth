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
exports.CustodyQueueEntity = exports.QueueStatus = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var QueueStatus;
(function (QueueStatus) {
    QueueStatus["PENDING"] = "pending";
    QueueStatus["PROCESSING"] = "processing";
    QueueStatus["COMPLETED"] = "completed";
    QueueStatus["FAILED"] = "failed";
})(QueueStatus || (exports.QueueStatus = QueueStatus = {}));
let CustodyQueueEntity = class CustodyQueueEntity {
    id;
    custodyTransfer;
    status;
    retryCount;
    blockchainTxHash;
    errorMessage;
    processedAt;
    createdAt;
    updatedAt;
};
exports.CustodyQueueEntity = CustodyQueueEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustodyQueueEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => Object),
    __metadata("design:type", Object)
], CustodyQueueEntity.prototype, "custodyTransfer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: QueueStatus, default: QueueStatus.PENDING }),
    (0, class_validator_1.IsEnum)(QueueStatus),
    __metadata("design:type", String)
], CustodyQueueEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], CustodyQueueEntity.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustodyQueueEntity.prototype, "blockchainTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustodyQueueEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CustodyQueueEntity.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustodyQueueEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustodyQueueEntity.prototype, "updatedAt", void 0);
exports.CustodyQueueEntity = CustodyQueueEntity = __decorate([
    (0, typeorm_1.Entity)('custody_queue'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['retryCount'])
], CustodyQueueEntity);
//# sourceMappingURL=custody-queue.entity.js.map