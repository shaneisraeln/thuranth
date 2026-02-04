import { io, Socket } from 'socket.io-client';
import { Vehicle, Parcel, Decision, Metrics } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string = 'http://localhost:3000') {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('authToken'),
      },
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, delay);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Vehicle updates
  onVehicleUpdate(callback: (vehicle: Vehicle) => void) {
    this.socket?.on('vehicle:update', callback);
  }

  onVehicleLocationUpdate(callback: (data: { vehicleId: string; location: { latitude: number; longitude: number } }) => void) {
    this.socket?.on('vehicle:location', callback);
  }

  // Parcel updates
  onParcelUpdate(callback: (parcel: Parcel) => void) {
    this.socket?.on('parcel:update', callback);
  }

  onParcelAssigned(callback: (data: { parcelId: string; vehicleId: string }) => void) {
    this.socket?.on('parcel:assigned', callback);
  }

  // Decision updates
  onDecisionMade(callback: (decision: Decision) => void) {
    this.socket?.on('decision:made', callback);
  }

  onDecisionOverridden(callback: (data: { decisionId: string; reason: string }) => void) {
    this.socket?.on('decision:overridden', callback);
  }

  // Metrics updates
  onMetricsUpdate(callback: (metrics: Partial<Metrics>) => void) {
    this.socket?.on('metrics:update', callback);
  }

  // SLA alerts
  onSLAAlert(callback: (data: { parcelId: string; risk: string; message: string }) => void) {
    this.socket?.on('sla:alert', callback);
  }

  // System alerts
  onSystemAlert(callback: (data: { type: string; message: string; severity: 'info' | 'warning' | 'error' }) => void) {
    this.socket?.on('system:alert', callback);
  }

  // Remove listeners
  off(event: string, callback?: Function) {
    this.socket?.off(event, callback);
  }

  // Join/leave rooms for targeted updates
  joinRoom(room: string) {
    this.socket?.emit('join', room);
  }

  leaveRoom(room: string) {
    this.socket?.emit('leave', room);
  }
}

export const websocketService = new WebSocketService();
export default websocketService;