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
exports.VehicleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const vehicle_entity_1 = require("../entities/vehicle.entity");
const vehicle_tracking_gateway_1 = require("../gateways/vehicle-tracking.gateway");
let VehicleService = class VehicleService {
    vehicleRepository;
    vehicleTrackingGateway;
    constructor(vehicleRepository, vehicleTrackingGateway) {
        this.vehicleRepository = vehicleRepository;
        this.vehicleTrackingGateway = vehicleTrackingGateway;
    }
    async createVehicle(createVehicleDto) {
        // Check if registration number already exists
        const existingVehicle = await this.vehicleRepository.findOne({
            where: { registrationNumber: createVehicleDto.registrationNumber },
        });
        if (existingVehicle) {
            throw new common_1.BadRequestException('Vehicle with this registration number already exists');
        }
        // Set default capacity values based on vehicle type
        const capacity = {
            ...createVehicleDto.capacity,
            currentWeight: 0,
            currentVolume: 0,
            utilizationPercentage: 0,
        };
        // Validate capacity limits based on vehicle type
        this.validateCapacityLimits(createVehicleDto.type, capacity);
        const vehicle = this.vehicleRepository.create({
            ...createVehicleDto,
            capacity,
            currentRoute: [],
            status: 'AVAILABLE',
            eligibilityScore: 100, // Default high eligibility
            lastUpdated: new Date(),
        });
        const savedVehicle = await this.vehicleRepository.save(vehicle);
        const vehicleData = this.mapEntityToVehicle(savedVehicle);
        // Broadcast vehicle creation to connected clients
        this.vehicleTrackingGateway.broadcastVehicleStatusUpdate(vehicleData);
        return vehicleData;
    }
    async findAllVehicles() {
        const vehicles = await this.vehicleRepository.find({
            order: { createdAt: 'DESC' },
        });
        return vehicles.map(vehicle => this.mapEntityToVehicle(vehicle));
    }
    async findVehicleById(id) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${id} not found`);
        }
        return this.mapEntityToVehicle(vehicle);
    }
    async findAvailableVehicles() {
        const vehicles = await this.vehicleRepository.find({
            where: { status: 'AVAILABLE' },
            order: { eligibilityScore: 'DESC' },
        });
        return vehicles.map(vehicle => this.mapEntityToVehicle(vehicle));
    }
    async findVehiclesByType(type) {
        const vehicles = await this.vehicleRepository.find({
            where: { type },
            order: { eligibilityScore: 'DESC' },
        });
        return vehicles.map(vehicle => this.mapEntityToVehicle(vehicle));
    }
    async updateVehicleLocation(updateLocationDto) {
        const vehicle = await this.vehicleRepository.findOne({
            where: { id: updateLocationDto.vehicleId },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${updateLocationDto.vehicleId} not found`);
        }
        // Validate GPS coordinates
        this.validateGPSCoordinates(updateLocationDto.location);
        // Update vehicle location and timestamp
        vehicle.currentLocation = updateLocationDto.location;
        vehicle.lastUpdated = new Date();
        const updatedVehicle = await this.vehicleRepository.save(vehicle);
        const vehicleData = this.mapEntityToVehicle(updatedVehicle);
        // Create location update object for WebSocket broadcast
        const locationUpdate = {
            vehicleId: updateLocationDto.vehicleId,
            location: updateLocationDto.location,
            timestamp: vehicle.lastUpdated,
            speed: updateLocationDto.speed,
            heading: updateLocationDto.heading,
        };
        // Broadcast location update to connected clients
        this.vehicleTrackingGateway.broadcastVehicleLocationUpdate(locationUpdate);
        return vehicleData;
    }
    async updateVehicleStatus(vehicleId, status) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${vehicleId} not found`);
        }
        vehicle.status = status;
        vehicle.lastUpdated = new Date();
        const updatedVehicle = await this.vehicleRepository.save(vehicle);
        const vehicleData = this.mapEntityToVehicle(updatedVehicle);
        // Broadcast status update to connected clients
        this.vehicleTrackingGateway.broadcastVehicleStatusUpdate(vehicleData);
        return vehicleData;
    }
    async deleteVehicle(id) {
        const vehicle = await this.vehicleRepository.findOne({ where: { id } });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${id} not found`);
        }
        await this.vehicleRepository.remove(vehicle);
    }
    validateCapacityLimits(type, capacity) {
        // Define capacity limits based on vehicle type
        const limits = {
            '2W': { maxWeight: 150, maxVolume: 500000 }, // 150kg, 0.5 cubic meters
            '4W': { maxWeight: 1000, maxVolume: 10000000 }, // 1000kg, 10 cubic meters
        };
        const limit = limits[type];
        if (capacity.maxWeight > limit.maxWeight) {
            throw new common_1.BadRequestException(`Maximum weight for ${type} vehicle cannot exceed ${limit.maxWeight}kg`);
        }
        if (capacity.maxVolume > limit.maxVolume) {
            throw new common_1.BadRequestException(`Maximum volume for ${type} vehicle cannot exceed ${limit.maxVolume}cm³`);
        }
    }
    validateGPSCoordinates(location) {
        if (location.latitude < -90 || location.latitude > 90) {
            throw new common_1.BadRequestException('Invalid latitude: must be between -90 and 90');
        }
        if (location.longitude < -180 || location.longitude > 180) {
            throw new common_1.BadRequestException('Invalid longitude: must be between -180 and 180');
        }
    }
    mapEntityToVehicle(entity) {
        return {
            id: entity.id,
            registrationNumber: entity.registrationNumber,
            type: entity.type,
            driverId: entity.driverId,
            capacity: entity.capacity,
            currentLocation: entity.currentLocation,
            currentRoute: entity.currentRoute,
            status: entity.status,
            eligibilityScore: parseFloat(entity.eligibilityScore.toString()),
            lastUpdated: entity.lastUpdated,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
};
exports.VehicleService = VehicleService;
exports.VehicleService = VehicleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(vehicle_entity_1.VehicleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        vehicle_tracking_gateway_1.VehicleTrackingGateway])
], VehicleService);
//# sourceMappingURL=vehicle.service.js.map