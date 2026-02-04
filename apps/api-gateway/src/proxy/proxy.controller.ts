import { 
  Controller, 
  All, 
  Req, 
  Res, 
  Param, 
  UseGuards,
  Logger 
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../api-key/guards/api-key.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Proxy')
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private proxyService: ProxyService) {}

  @All('decision-engine/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to Decision Engine Service' })
  async proxyToDecisionEngine(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('decision-engine', req, res);
  }

  @All('vehicle-tracking/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to Vehicle Tracking Service' })
  async proxyToVehicleTracking(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('vehicle-tracking', req, res);
  }

  @All('auth/*')
  @Public()
  @ApiOperation({ summary: 'Proxy requests to Auth Service' })
  async proxyToAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('auth-service', req, res);
  }

  @All('parcels/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to Parcel Management Service' })
  async proxyToParcels(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('parcel-management', req, res);
  }

  @All('custody/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to Custody Service' })
  async proxyToCustody(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('custody-service', req, res);
  }

  @All('analytics/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to Analytics Service' })
  async proxyToAnalytics(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('analytics-service', req, res);
  }

  @All('audit/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proxy requests to Audit Service' })
  async proxyToAudit(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('audit-service', req, res);
  }

  @All('external/*')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'External API endpoints requiring API key' })
  async proxyExternal(@Req() req: Request, @Res() res: Response) {
    // Route external API calls based on the path
    const pathSegments = req.path.split('/');
    const serviceName = pathSegments[3]; // /api/v1/external/{service}
    
    if (!serviceName) {
      return res.status(400).json({ error: 'Service name required' });
    }

    return this.proxyToService(serviceName, req, res);
  }

  private async proxyToService(serviceName: string, req: Request, res: Response) {
    try {
      // Extract the path after the service name
      const pathSegments = req.path.split('/');
      const serviceIndex = pathSegments.findIndex(segment => segment === serviceName.replace('-service', ''));
      const servicePath = '/' + pathSegments.slice(serviceIndex + 1).join('/');

      // Forward headers (excluding host)
      const { host, ...forwardHeaders } = req.headers;
      
      // Add user context if available
      if (req.user) {
        forwardHeaders['x-user-id'] = (req.user as any).userId;
        forwardHeaders['x-user-role'] = (req.user as any).role;
      }

      const response = await this.proxyService.proxyRequest(
        serviceName,
        servicePath,
        req.method,
        req.body,
        forwardHeaders as Record<string, string>,
        req.query as Record<string, string>
      );

      // Forward response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-encoding') {
          res.set(key, value as string);
        }
      });

      res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(`Proxy error: ${error.message}`);
      
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(502).json({
          error: 'Bad Gateway',
          message: `Service ${serviceName} unavailable`,
        });
      }
    }
  }
}