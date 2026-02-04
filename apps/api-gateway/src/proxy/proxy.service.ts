import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

export interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private services: Map<string, ServiceConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeServices();
  }

  private initializeServices() {
    const services = [
      {
        name: 'decision-engine',
        url: this.configService.get('DECISION_ENGINE_URL', 'http://localhost:3001'),
        timeout: 30000,
        retries: 3,
      },
      {
        name: 'vehicle-tracking',
        url: this.configService.get('VEHICLE_TRACKING_URL', 'http://localhost:3002'),
        timeout: 30000,
        retries: 3,
      },
      {
        name: 'auth-service',
        url: this.configService.get('AUTH_SERVICE_URL', 'http://localhost:3003'),
        timeout: 30000,
        retries: 3,
      },
      {
        name: 'parcel-management',
        url: this.configService.get('PARCEL_MANAGEMENT_URL', 'http://localhost:3004'),
        timeout: 30000,
        retries: 3,
      },
      {
        name: 'custody-service',
        url: this.configService.get('CUSTODY_SERVICE_URL', 'http://localhost:3005'),
        timeout: 30000,
        retries: 3,
      },
      {
        name: 'analytics-service',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:3006'),
        timeout: 30000,
        retries: 3,
      },
      {
        name: 'audit-service',
        url: this.configService.get('AUDIT_SERVICE_URL', 'http://localhost:3007'),
        timeout: 30000,
        retries: 3,
      },
    ];

    services.forEach(service => {
      this.services.set(service.name, service);
    });
  }

  async proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: Record<string, string>,
    params?: Record<string, string>
  ): Promise<AxiosResponse> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new BadGatewayException(`Service ${serviceName} not found`);
    }

    const url = `${service.url}${path}`;
    
    try {
      this.logger.log(`Proxying ${method} ${url}`);
      
      const response = await axios({
        method: method.toLowerCase() as any,
        url,
        data,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        params,
        timeout: service.timeout,
      });

      return response;
    } catch (error) {
      this.logger.error(`Error proxying to ${serviceName}: ${error.message}`);
      
      if (error.response) {
        // Forward the error response from the service
        throw new BadGatewayException({
          message: `Service ${serviceName} error`,
          statusCode: error.response.status,
          error: error.response.data,
        });
      }
      
      throw new BadGatewayException(`Service ${serviceName} unavailable`);
    }
  }

  getServiceHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    
    // In a real implementation, this would ping each service
    this.services.forEach((service, name) => {
      health[name] = true; // Placeholder
    });
    
    return health;
  }
}