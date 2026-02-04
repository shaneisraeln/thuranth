import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}

@WSGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.role = payload.role;

      this.connectedClients.set(client.id, client);
      
      this.logger.log(`Client ${client.id} connected (User: ${client.userId}, Role: ${client.role})`);
      
      // Join role-based rooms
      client.join(`role:${client.role}`);
      client.join(`user:${client.userId}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to PDCP WebSocket',
        userId: client.userId,
        role: client.role,
      });

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] }
  ) {
    if (!data.channels || !Array.isArray(data.channels)) {
      client.emit('error', { message: 'Invalid channels format' });
      return;
    }

    // Subscribe to specific channels based on user role
    data.channels.forEach(channel => {
      if (this.canSubscribeToChannel(client, channel)) {
        client.join(channel);
        this.logger.log(`Client ${client.id} subscribed to ${channel}`);
      } else {
        client.emit('error', { message: `Not authorized to subscribe to ${channel}` });
      }
    });

    client.emit('subscribed', { channels: data.channels });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] }
  ) {
    data.channels.forEach(channel => {
      client.leave(channel);
      this.logger.log(`Client ${client.id} unsubscribed from ${channel}`);
    });

    client.emit('unsubscribed', { channels: data.channels });
  }

  // Broadcast methods for services to use
  broadcastVehicleUpdate(vehicleId: string, data: any) {
    this.server.to(`vehicle:${vehicleId}`).emit('vehicle:update', data);
    this.server.to('role:dispatcher').emit('vehicle:update', data);
  }

  broadcastParcelUpdate(parcelId: string, data: any) {
    this.server.to(`parcel:${parcelId}`).emit('parcel:update', data);
    this.server.to('role:dispatcher').emit('parcel:update', data);
  }

  broadcastDecisionUpdate(data: any) {
    this.server.to('role:dispatcher').emit('decision:update', data);
  }

  broadcastSLAAlert(data: any) {
    this.server.to('role:dispatcher').emit('sla:alert', data);
    this.server.to('role:admin').emit('sla:alert', data);
  }

  broadcastSystemAlert(data: any) {
    this.server.to('role:admin').emit('system:alert', data);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private canSubscribeToChannel(client: AuthenticatedSocket, channel: string): boolean {
    const [type, identifier] = channel.split(':');

    switch (type) {
      case 'vehicle':
        return client.role === 'dispatcher' || client.role === 'driver' || client.role === 'admin';
      case 'parcel':
        return client.role === 'dispatcher' || client.role === 'admin';
      case 'decision':
        return client.role === 'dispatcher' || client.role === 'admin';
      case 'sla':
        return client.role === 'dispatcher' || client.role === 'admin';
      case 'system':
        return client.role === 'admin';
      case 'user':
        return identifier === client.userId || client.role === 'admin';
      default:
        return false;
    }
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getConnectedClientsByRole(role: string): number {
    return Array.from(this.connectedClients.values())
      .filter(client => client.role === role).length;
  }
}