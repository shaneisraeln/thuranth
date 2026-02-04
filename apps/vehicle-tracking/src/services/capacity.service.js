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
exports.CapacityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const vehicle_entity_1 = require("../entities/vehicle.entity");
const vehicle_tracking_gateway_1 = require("../gateways/vehicle-tracking.gateway");
let CapacityService = class CapacityService {
    vehicleRepository;
    vehicleTrackingGateway;
    NEAR_FULL_THRESHOLD = 90; // 90% capacity threshold
    constructor(vehicleRepository, vehicleTrackingGateway) {
        this.vehicleRepository = vehicleRepository;
        this.vehicleTrackingGateway = vehicleTrackingGateway;
    }
    async assignParcelToVehicle(vehicleId, parcelDimensions) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${vehicleId} not found`);
        }
        const previousCapacity = { ...vehicle.capacity };
        // Check if assignment would exceed capacity
        const newWeight = vehicle.capacity.currentWeight + parcelDimensions.weight;
        const newVolume = vehicle.capacity.currentVolume + parcelDimensions.volume;
        if (newWeight > vehicle.capacity.maxWeight) {
            throw new common_1.BadRequestException(`Assignment would exceed weight capacity. Available: ${vehicle.capacity.maxWeight - vehicle.capacity.currentWeight}kg, Required: ${parcelDimensions.weight}kg`);
        }
        if (newVolume > vehicle.capacity.maxVolume) {
            throw new common_1.BadRequestException(`Assignment would exceed volume capacity. Available: ${vehicle.capacity.maxVolume - vehicle.capacity.currentVolume}cm³, Required: ${parcelDimensions.volume}cm³`);
        }
        // Update capacity
        const newCapacity = this.calculateUpdatedCapacity(vehicle.capacity, parcelDimensions, 'ADD');
        vehicle.capacity = newCapacity;
        vehicle.lastUpdated = new Date();
        await this.vehicleRepository.save(vehicle);
        const isNearFull = this.isVehicleNearFull(newCapacity);
        const utilizationChange = newCapacity.utilizationPercentage - previousCapacity.utilizationPercentage;
        const result = {
            vehicleId,
            previousCapacity,
            newCapacity,
            isNearFull,
            utilizationChange,
        };
        // Broadcast capacity update to connected clients
        this.vehicleTrackingGateway.broadcastCapacityUpdate(vehicleId, result);
        // Send near-full alert if threshold is reached
        if (isNearFull && !this.isVehicleNearFull(previousCapacity)) {
            this.vehicleTrackingGateway.broadcastNearFullAlert(vehicleId, result);
        }
        return result;
    }
    async removeParcelFromVehicle(vehicleId, parcelDimensions) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${vehicleId} not found`);
        }
        const previousCapacity = { ...vehicle.capacity };
        // Check if removal would result in negative capacity
        const newWeight = vehicle.capacity.currentWeight - parcelDimensions.weight;
        const newVolume = vehicle.capacity.currentVolume - parcelDimensions.volume;
        if (newWeight < 0 || newVolume < 0) {
            throw new common_1.BadRequestException('Cannot remove parcel: would result in negative capacity');
        }
        // Update capacity
        const newCapacity = this.calculateUpdatedCapacity(vehicle.capacity, parcelDimensions, 'REMOVE');
        vehicle.capacity = newCapacity;
        vehicle.lastUpdated = new Date();
        await this.vehicleRepository.save(vehicle);
        const isNearFull = this.isVehicleNearFull(newCapacity);
        const utilizationChange = newCapacity.utilizationPercentage - previousCapacity.utilizationPercentage;
        const result = {
            vehicleId,
            previousCapacity,
            newCapacity,
            isNearFull,
            utilizationChange,
        };
        // Broadcast capacity update to connected clients
        this.vehicleTrackingGateway.broadcastCapacityUpdate(vehicleId, result);
        return result;
    }
    async getVehicleCapacity(vehicleId) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${vehicleId} not found`);
        }
        return vehicle.capacity;
    }
    async getNearFullVehicles() {
        const vehicles = await this.vehicleRepository.find();
        return vehicles.filter(vehicle => this.isVehicleNearFull(vehicle.capacity));
    }
    async getCapacityUtilizationStats() {
        const vehicles = await this.vehicleRepository.find();
        const nearFullVehicles = vehicles.filter(vehicle => this.isVehicleNearFull(vehicle.capacity)).length;
        const totalUtilization = vehicles.reduce((sum, vehicle) => sum + vehicle.capacity.utilizationPercentage, 0);
        const averageUtilization = vehicles.length > 0 ? totalUtilization / vehicles.length : 0;
        const utilizationByType = {
            '2W': 0,
            '4W': 0,
        };
        const vehiclesByType = vehicles.reduce((acc, vehicle) => {
            if (!acc[vehicle.type])
                acc[vehicle.type] = [];
            acc[vehicle.type].push(vehicle);
            return acc;
        }, {});
        Object.keys(utilizationByType).forEach(type => {
            const typeVehicles = vehiclesByType[type] || [];
            if (typeVehicles.length > 0) {
                const typeUtilization = typeVehicles.reduce((sum, vehicle) => sum + vehicle.capacity.utilizationPercentage, 0);
                utilizationByType[type] = typeUtilization / typeVehicles.length;
            }
        });
        return {
            totalVehicles: vehicles.length,
            nearFullVehicles,
            averageUtilization,
            utilizationByType,
        };
    }
    calculateUpdatedCapacity(currentCapacity, parcelDimensions, operation) {
        const multiplier = operation === 'ADD' ? 1 : -1;
        const newWeight = currentCapacity.currentWeight + (parcelDimensions.weight * multiplier);
        const newVolume = currentCapacity.currentVolume + (parcelDimensions.volume * multiplier);
        // Calculate utilization percentage based on the more constraining factor
        const weightUtilization = (newWeight / currentCapacity.maxWeight) * 100;
        const volumeUtilization = (newVolume / currentCapacity.maxVolume) * 100;
        const utilizationPercentage = Math.max(weightUtilization, volumeUtilization);
        return {
            maxWeight: currentCapacity.maxWeight,
            maxVolume: currentCapacity.maxVolume,
            currentWeight: Math.max(0, newWeight),
            currentVolume: Math.max(0, newVolume),
            utilizationPercentage: Math.min(100, Math.max(0, utilizationPercentage)),
        };
    }
    isVehicleNearFull(capacity) {
        return capacity.utilizationPercentage >= this.NEAR_FULL_THRESHOLD;
    }
    async recalculateVehicleCapacity(vehicleId, parcels) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${vehicleId} not found`);
        }
        const previousCapacity = { ...vehicle.capacity };
        // Calculate total weight and volume from all parcels
        const totalWeight = parcels.reduce((sum, parcel) => sum + parcel.weight, 0);
        const totalVolume = parcels.reduce((sum, parcel) => sum + parcel.volume, 0);
        // Validate against capacity limits
        if (totalWeight > vehicle.capacity.maxWeight) {
            throw new common_1.BadRequestException('Total parcel weight exceeds vehicle capacity');
        }
        if (totalVolume > vehicle.capacity.maxVolume) {
            throw new common_1.BadRequestException('Total parcel volume exceeds vehicle capacity');
        }
        // Calculate utilization percentage
        const weightUtilization = (totalWeight / vehicle.capacity.maxWeight) * 100;
        const volumeUtilization = (totalVolume / vehicle.capacity.maxVolume) * 100;
        const utilizationPercentage = Math.max(weightUtilization, volumeUtilization);
        const newCapacity = {
            maxWeight: vehicle.capacity.maxWeight,
            maxVolume: vehicle.capacity.maxVolume,
            currentWeight: totalWeight,
            currentVolume: totalVolume,
            utilizationPercentage: Math.min(100, utilizationPercentage),
        };
        // Update vehicle capacity
        vehicle.capacity = newCapacity;
        vehicle.lastUpdated = new Date();
        await this.vehicleRepository.save(vehicle);
        // Broadcast capacity update
        const result = {
            vehicleId,
            previousCapacity,
            newCapacity,
            isNearFull: this.isVehicleNearFull(newCapacity),
            utilizationChange: newCapacity.utilizationPercentage - previousCapacity.utilizationPercentage,
        };
        this.vehicleTrackingGateway.broadcastCapacityUpdate(vehicleId, result);
        return newCapacity;
    }
};
exports.CapacityService = CapacityService;
exports.CapacityService = CapacityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(vehicle_entity_1.VehicleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        vehicle_tracking_gateway_1.VehicleTrackingGateway])
], CapacityService);
//# sourceMappingURL=capacity.service.js.map