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
exports.VehicleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vehicle_service_1 = require("../services/vehicle.service");
const shared_1 = require("@pdcp/shared");
let VehicleController = class VehicleController {
    vehicleService;
    constructor(vehicleService) {
        this.vehicleService = vehicleService;
    }
    async createVehicle(createVehicleDto) {
        return this.vehicleService.createVehicle(createVehicleDto);
    }
    async findAllVehicles(type, status) {
        if (type) {
            return this.vehicleService.findVehiclesByType(type);
        }
        if (status === 'AVAILABLE') {
            return this.vehicleService.findAvailableVehicles();
        }
        return this.vehicleService.findAllVehicles();
    }
    async findVehicleById(id) {
        return this.vehicleService.findVehicleById(id);
    }
    async updateVehicleLocation(id, updateLocationDto) {
        const updateDto = {
            vehicleId: id,
            ...updateLocationDto,
        };
        return this.vehicleService.updateVehicleLocation(updateDto);
    }
    async updateVehicleStatus(id, status) {
        return this.vehicleService.updateVehicleStatus(id, status);
    }
    async deleteVehicle(id) {
        return this.vehicleService.deleteVehicle(id);
    }
    async getAvailableVehicleCount() {
        const vehicles = await this.vehicleService.findAvailableVehicles();
        return { count: vehicles.length };
    }
};
exports.VehicleController = VehicleController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new vehicle' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Vehicle successfully registered' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid vehicle data or registration number already exists' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shared_1.CreateVehicleDto]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "createVehicle", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all vehicles' }),
    (0, swagger_1.ApiQuery)({ name: 'type', enum: ['2W', '4W'], required: false, description: 'Filter by vehicle type' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: ['AVAILABLE', 'ON_ROUTE', 'OFFLINE', 'MAINTENANCE'], required: false, description: 'Filter by vehicle status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of vehicles retrieved successfully' }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "findAllVehicles", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vehicle by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vehicle retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "findVehicleById", null);
__decorate([
    (0, common_1.Put)(':id/location'),
    (0, swagger_1.ApiOperation)({ summary: 'Update vehicle location' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vehicle location updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid GPS coordinates' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "updateVehicleLocation", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update vehicle status' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vehicle status updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "updateVehicleStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete vehicle' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Vehicle UUID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Vehicle deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Vehicle not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "deleteVehicle", null);
__decorate([
    (0, common_1.Get)('available/count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get count of available vehicles' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Available vehicle count retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VehicleController.prototype, "getAvailableVehicleCount", null);
exports.VehicleController = VehicleController = __decorate([
    (0, swagger_1.ApiTags)('vehicles'),
    (0, common_1.Controller)('vehicles'),
    __metadata("design:paramtypes", [vehicle_service_1.VehicleService])
], VehicleController);
//# sourceMappingURL=vehicle.controller.js.map