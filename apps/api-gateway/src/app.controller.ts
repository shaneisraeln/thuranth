import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Welcome page' })
  @ApiResponse({ status: 200, description: 'Welcome message' })
  getWelcome() {
    return {
      message: 'Welcome to Post-Dispatch Consolidation Platform (PDCP)',
      version: '1.0.0',
      description: 'B2B SaaS platform for last-mile logistics consolidation',
      endpoints: {
        health: '/api/v1/health',
        documentation: '/api/docs',
        api: '/api/v1'
      },
      services: [
        'API Gateway',
        'Decision Engine',
        'Vehicle Tracking',
        'Authentication Service',
        'Parcel Management',
        'Custody Service',
        'Analytics Service',
        'Audit Service'
      ],
      timestamp: new Date().toISOString()
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'System status' })
  @ApiResponse({ status: 200, description: 'System status information' })
  getStatus() {
    return {
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
  }
}