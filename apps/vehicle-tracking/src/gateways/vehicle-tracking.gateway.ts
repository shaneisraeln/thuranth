import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VehicleLocationUpdate, Vehicle } from '@pdcp/types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  namespace: '/vehicle-tracking',
})
export class VehicleTrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VehicleTrackingGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  handleConnection(client: AuthenticatedSocket) {
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
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe-vehicle-updates')
  handleSubscribeVehicleUpdates(
    @MessageBody() data: { vehicleIds?: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const vehicleIds = data.vehicleIds || [];
    
    if (vehicleIds.length > 0) {
      // Subscribe to specific vehicles
      vehicleIds.forEach(vehicleId => {
        client.join(`vehicle:${vehicleId}`);
      });
      this.logger.log(`Client ${client.id} subscribed to vehicles: ${vehicleIds.join(', ')}`);
    } else {
      // Subscribe to all vehicle updates
      client.join('all-vehicles');
      this.logger.log(`Client ${client.id} subscribed to all vehicle updates`);
    }

    client.emit('subscription-confirmed', {
      vehicleIds,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribe-vehicle-updates')
  handleUnsubscribeVehicleUpdates(
    @MessageBody() data: { vehicleIds?: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const vehicleIds = data.vehicleIds || [];
    
    if (vehicleIds.length > 0) {
      // Unsubscribe from specific vehicles
      vehicleIds.forEach(vehicleId => {
        client.leave(`vehicle:${vehicleId}`);
      });
      this.logger.log(`Client ${client.id} unsubscribed from vehicles: ${vehicleIds.join(', ')}`);
    } else {
      // Unsubscribe from all vehicle updates
      client.leave('all-vehicles');
      this.logger.log(`Client ${client.id} unsubscribed from all vehicle updates`);
    }

    client.emit('unsubscription-confirmed', {
      vehicleIds,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('get-vehicle-status')
  handleGetVehicleStatus(
    @MessageBody() data: { vehicleId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // This would typically fetch current vehicle status from the database
    // For now, we'll emit a placeholder response
    client.emit('vehicle-status', {
      vehicleId: data.vehicleId,
      status: 'requested',
      timestamp: new Date().toISOString(),
    });
  }

  // Methods to broadcast updates to connected clients
  broadcastVehicleLocationUpdate(locationUpdate: VehicleLocationUpdate) {
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

  broadcastVehicleStatusUpdate(vehicle: Vehicle) {
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

  broadcastCapacityUpdate(vehicleId: string, capacityData: any) {
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

  broadcastNearFullAlert(vehicleId: string, capacityData: any) {
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
  getConnectedClientCount(): number {
    return this.connectedClients.size;
  }

  // Utility method to get clients subscribed to a specific vehicle
  getVehicleSubscriberCount(vehicleId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`vehicle:${vehicleId}`);
    return room ? room.size : 0;
  }
}