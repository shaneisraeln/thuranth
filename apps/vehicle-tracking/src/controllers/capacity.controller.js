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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapacityStatsController = exports.CapacityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const capacity_service_1 = require("../services/capacity.service");
class AssignParcelDto {
    weight;
    volume;
}
class RecalculateCapacityDto {
    parcels;
}
let CapacityController = class CapacityController {
    capacityService;
    constructor(capacityService) {
        this.capacityService = capacityService;
    }
    async getVehicleCapacity(vehicleId) {
        return this.capacityService.getVehicleCapacity(vehicleId);
    }
    async assignParcel(vehicleId, assignParcelDto) {
        return this.capacityService.assignParcelToVehicle(vehicleId, assignParcelDto);
    }
    async removeParcel(vehicleId, removeParcelDto) {
        return this.capacityService.removeParcelFromVehicle(vehicleId, removeParcelDto);
    }
    async recalculateCapacity(vehicleId, recalculateDto) {
        return this.capacityService.recalculateVehicleCapacity(vehicleId, recalculateDto.parcels);
    }
};
exports.CapacityController = CapacityController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicle capacity information' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vehicle capacity retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('vehicleId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CapacityController.prototype, "getVehicleCapacity", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign parcel to vehicle and update capacity' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Parcel assigned and capacity updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Assignment would exceed vehicle capacity' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('vehicleId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AssignParcelDto]),
    __metadata("design:returntype", Promise)
], CapacityController.prototype, "assignParcel", null);
__decorate([
    (0, common_1.Post)('remove'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove parcel from vehicle and update capacity' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Parcel removed and capacity updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot remove parcel: would result in negative capacity' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('vehicleId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AssignParcelDto]),
    __metadata("design:returntype", Promise)
], CapacityController.prototype, "removeParcel", null);
__decorate([
    (0, common_1.Put)('recalculate'),
    (0, swagger_1.ApiOperation)({ summary: 'Recalculate vehicle capacity based on current parcels' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vehicle capacity recalculated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Total parcel dimensions exceed vehicle capacity' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('vehicleId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RecalculateCapacityDto]),
    __metadata("design:returntype", Promise)
], CapacityController.prototype, "recalculateCapacity", null);
exports.CapacityController = CapacityController = __decorate([
    (0, swagger_1.ApiTags)('capacity'),
    (0, common_1.Controller)('vehicles/:vehicleId/capacity'),
    __metadata("design:paramtypes", [capacity_service_1.CapacityService])
], CapacityController);
let CapacityStatsController = class CapacityStatsController {
    capacityService;
    constructor(capacityService) {
        this.capacityService = capacityService;
    }
    async getNearFullVehicles() {
        return this.capacityService.getNearFullVehicles();
    }
    async getCapacityStats() {
        return this.capacityService.getCapacityUtilizationStats();
    }
};
exports.CapacityStatsController = CapacityStatsController;
__decorate([
    (0, common_1.Get)('near-full'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicles that are near full capacity (90%+)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Near-full vehicles retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CapacityStatsController.prototype, "getNearFullVehicles", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get capacity utilization statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Capacity statistics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CapacityStatsController.prototype, "getCapacityStats", null);
exports.CapacityStatsController = CapacityStatsController = __decorate([
    (0, swagger_1.ApiTags)('capacity'),
    (0, common_1.Controller)('capacity'),
    __metadata("design:paramtypes", [capacity_service_1.CapacityService])
], CapacityStatsController);
//# sourceMappingURL=capacity.controller.js.map