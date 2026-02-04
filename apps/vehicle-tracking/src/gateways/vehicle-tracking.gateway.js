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
var VehicleTrackingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleTrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
let VehicleTrackingGateway = VehicleTrackingGateway_1 = class VehicleTrackingGateway {
    server;
    logger = new common_1.Logger(VehicleTrackingGateway_1.name);
    connectedClients = new Map();
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        // Basic authentication check - in production, implement proper JWT validation
        const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
        if (!token) {
            this.logger.warn(`Client ${client.id} connected without authentication token`);
            client.disconnect();
            return;
        }
        // Mock authentication - replace with actual JWT validation
        try {
            // In production, decode and validate JWT token here
            client.userId = 'mock-user-id';
            client.userRole = 'dispatcher'; // or 'driver', 'admin'
            this.connectedClients.set(client.id, client);
            this.logger.log(`Client ${client.id} authenticated as ${client.userRole}`);
            // Send initial connection confirmation
            client.emit('connected', {
                message: 'Connected to vehicle tracking service',
                clientId: client.id,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            this.logger.error(`Authentication failed for client ${client.id}:`, error);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.connectedClients.delete(client.id);
    }
    handleSubscribeVehicleUpdates(data, client) {
        const vehicleIds = data.vehicleIds || [];
        if (vehicleIds.length > 0) {
            // Subscribe to specific vehicles
            vehicleIds.forEach(vehicleId => {
                client.join(`vehicle:${vehicleId}`);
            });
            this.logger.log(`Client ${client.id} subscribed to vehicles: ${vehicleIds.join(', ')}`);
        }
        else {
            // Subscribe to all vehicle updates
            client.join('all-vehicles');
            this.logger.log(`Client ${client.id} subscribed to all vehicle updates`);
        }
        client.emit('subscription-confirmed', {
            vehicleIds,
            timestamp: new Date().toISOString(),
        });
    }
    handleUnsubscribeVehicleUpdates(data, client) {
        const vehicleIds = data.vehicleIds || [];
        if (vehicleIds.length > 0) {
            // Unsubscribe from specific vehicles
            vehicleIds.forEach(vehicleId => {
                client.leave(`vehicle:${vehicleId}`);
            });
            this.logger.log(`Client ${client.id} unsubscribed from vehicles: ${vehicleIds.join(', ')}`);
        }
        else {
            // Unsubscribe from all vehicle updates
            client.leave('all-vehicles');
            this.logger.log(`Client ${client.id} unsubscribed from all vehicle updates`);
        }
        client.emit('unsubscription-confirmed', {
            vehicleIds,
            timestamp: new Date().toISOString(),
        });
    }
    handleGetVehicleStatus(data, client) {
        // This would typically fetch current vehicle status from the database
        // For now, we'll emit a placeholder response
        client.emit('vehicle-status', {
            vehicleId: data.vehicleId,
            status: 'requested',
            timestamp: new Date().toISOString(),
        });
    }
    // Methods to broadcast updates to connected clients
    broadcastVehicleLocationUpdate(locationUpdate) {
        const payload = {
            type: 'location-update',
            data: locationUpdate,
            timestamp: new Date().toISOString(),
        };
        // Broadcast to clients subscribed to this specific vehicle
        this.server.to(`vehicle:${locationUpdate.vehicleId}`).emit('vehicle-update', payload);
        // Broadcast to clients subscribed to all vehicles
        this.server.to('all-vehicles').emit('vehicle-update', payload);
        this.logger.debug(`Broadcasted location update for vehicle ${locationUpdate.vehicleId}`);
    }
    broadcastVehicleStatusUpdate(vehicle) {
        const payload = {
            type: 'status-update',
            data: {
                vehicleId: vehicle.id,
                status: vehicle.status,
                capacity: vehicle.capacity,
                lastUpdated: vehicle.lastUpdated,
            },
            timestamp: new Date().toISOString(),
        };
        // Broadcast to clients subscribed to this specific vehicle
        this.server.to(`vehicle:${vehicle.id}`).emit('vehicle-update', payload);
        // Broadcast to clients subscribed to all vehicles
        this.server.to('all-vehicles').emit('vehicle-update', payload);
        this.logger.debug(`Broadcasted status update for vehicle ${vehicle.id}`);
    }
    broadcastCapacityUpdate(vehicleId, capacityData) {
        const payload = {
            type: 'capacity-update',
            data: {
                vehicleId,
                ...capacityData,
            },
            timestamp: new Date().toISOString(),
        };
        // Broadcast to clients subscribed to this specific vehicle
        this.server.to(`vehicle:${vehicleId}`).emit('vehicle-update', payload);
        // Broadcast to clients subscribed to all vehicles
        this.server.to('all-vehicles').emit('vehicle-update', payload);
        this.logger.debug(`Broadcasted capacity update for vehicle ${vehicleId}`);
    }
    broadcastNearFullAlert(vehicleId, capacityData) {
        const payload = {
            type: 'near-full-alert',
            data: {
                vehicleId,
                ...capacityData,
                alert: 'Vehicle is near full capacity (90%+)',
            },
            timestamp: new Date().toISOString(),
        };
        // Broadcast alert to all connected clients
        this.server.emit('capacity-alert', payload);
        this.logger.warn(`Broadcasted near-full alert for vehicle ${vehicleId}`);
    }
    // Utility method to get connected client count
    getConnectedClientCount() {
        return this.connectedClients.size;
    }
    // Utility method to get clients subscribed to a specific vehicle
    getVehicleSubscriberCount(vehicleId) {
        const room = this.server.sockets.adapter.rooms.get(`vehicle:${vehicleId}`);
        return room ? room.size : 0;
    }
};
exports.VehicleTrackingGateway = VehicleTrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], VehicleTrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-vehicle-updates'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VehicleTrackingGateway.prototype, "handleSubscribeVehicleUpdates", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe-vehicle-updates'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VehicleTrackingGateway.prototype, "handleUnsubscribeVehicleUpdates", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get-vehicle-status'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VehicleTrackingGateway.prototype, "handleGetVehicleStatus", null);
exports.VehicleTrackingGateway = VehicleTrackingGateway = VehicleTrackingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        },
        namespace: '/vehicle-tracking',
    })
], VehicleTrackingGateway);
//# sourceMappingURL=vehicle-tracking.gateway.js.map