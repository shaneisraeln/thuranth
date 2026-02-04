import { Injectable } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: Record<string, {
    status: 'up' | 'down';
    responseTime?: number;
    error?: string;
  }>;
  gateway: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    connections: {
      websocket: number;
      http: number;
    };
  };
}

@Injectable()
export class HealthService {
  private startTime = Date.now();

  constructor(private proxyService: ProxyService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const services = this.proxyService.getServiceHealth();
    const serviceStatuses: Record<string, any> = {};

    // Check each service health
    for (const [serviceName, isHealthy] of Object.entries(services)) {
      serviceStatuses[serviceName] = {
        status: isHealthy ? 'up' : 'down',
        responseTime: isHealthy ? Math.random() * 100 : undefined, // Mock response time
        error: isHealthy ? undefined : 'Service unavailable',
      };
    }

    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    // Determine overall status
    const unhealthyServices = Object.values(serviceStatuses).filter(s => s.status === 'down').length;
    const totalServices = Object.keys(serviceStatuses).length;
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (unhealthyServices === totalServices) {
      overallStatus = 'unhealthy';
    } else if (unhealthyServices > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: serviceStatuses,
      gateway: {
        uptime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
        },
        connections: {
          websocket: 0, // Would be populated from WebSocket gateway
          http: 0, // Would be tracked by middleware
        },
      },
    };
  }

  async getServiceHealth(serviceName: string): Promise<any> {
    // In a real implementation, this would ping the specific service
    return {
      service: serviceName,
      status: 'up',
      timestamp: new Date().toISOString(),
      responseTime: Math.random() * 100,
    };
  }
}