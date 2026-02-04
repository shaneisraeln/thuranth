import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system health status' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get specific service health status' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getServiceHealth(@Param('serviceName') serviceName: string) {
    return this.healthService.getServiceHealth(serviceName);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readiness() {
    const health = await this.healthService.getHealthStatus();
    return {
      status: health.status !== 'unhealthy' ? 'ready' : 'not ready',
      timestamp: health.timestamp,
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - process.uptime() * 1000,
    };
  }
}