import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards,
  BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MapsService, GeoCoordinate, RouteWaypoint } from './maps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class GeocodeDto {
  address: string;
}

class ReverseGeocodeDto {
  latitude: number;
  longitude: number;
}

class RouteCalculationDto {
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  waypoints?: GeoCoordinate[];
}

class RouteOptimizationDto {
  waypoints: RouteWaypoint[];
}

class ETACalculationDto {
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  departureTime?: string; // ISO string
}

class TrafficInfoDto {
  origin: GeoCoordinate;
  destination: GeoCoordinate;
}

class NearbyVehiclesDto {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

@ApiTags('Maps')
@Controller('maps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MapsController {
  constructor(private mapsService: MapsService) {}

  @Post('geocode')
  @ApiOperation({ summary: 'Convert address to coordinates' })
  @ApiResponse({ status: 200, description: 'Geocoding successful' })
  async geocode(@Body() geocodeDto: GeocodeDto) {
    if (!geocodeDto.address || geocodeDto.address.trim().length === 0) {
      throw new BadRequestException('Address is required');
    }

    const coordinates = await this.mapsService.geocodeAddress(geocodeDto.address);
    return {
      address: geocodeDto.address,
      coordinates,
    };
  }

  @Post('reverse-geocode')
  @ApiOperation({ summary: 'Convert coordinates to address' })
  @ApiResponse({ status: 200, description: 'Reverse geocoding successful' })
  async reverseGeocode(@Body() reverseGeocodeDto: ReverseGeocodeDto) {
    if (!this.isValidCoordinate(reverseGeocodeDto)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }

    const address = await this.mapsService.reverseGeocode({
      latitude: reverseGeocodeDto.latitude,
      longitude: reverseGeocodeDto.longitude,
    });

    return {
      coordinates: {
        latitude: reverseGeocodeDto.latitude,
        longitude: reverseGeocodeDto.longitude,
      },
      address,
    };
  }

  @Post('route/calculate')
  @ApiOperation({ summary: 'Calculate route between points' })
  @ApiResponse({ status: 200, description: 'Route calculation successful' })
  async calculateRoute(@Body() routeDto: RouteCalculationDto) {
    if (!this.isValidCoordinate(routeDto.origin) || !this.isValidCoordinate(routeDto.destination)) {
      throw new BadRequestException('Valid origin and destination coordinates are required');
    }

    if (routeDto.waypoints) {
      for (const waypoint of routeDto.waypoints) {
        if (!this.isValidCoordinate(waypoint)) {
          throw new BadRequestException('All waypoints must have valid coordinates');
        }
      }
    }

    const route = await this.mapsService.calculateRoute(
      routeDto.origin,
      routeDto.destination,
      routeDto.waypoints,
    );

    return {
      route,
      summary: {
        totalDistance: `${(route.totalDistance / 1000).toFixed(2)} km`,
        totalDuration: `${Math.round(route.totalDuration / 60)} minutes`,
        waypoints: route.waypoints.length,
      },
    };
  }

  @Post('route/optimize')
  @ApiOperation({ summary: 'Optimize route with multiple waypoints' })
  @ApiResponse({ status: 200, description: 'Route optimization successful' })
  async optimizeRoute(@Body() optimizationDto: RouteOptimizationDto) {
    if (!optimizationDto.waypoints || optimizationDto.waypoints.length < 2) {
      throw new BadRequestException('At least 2 waypoints are required for route optimization');
    }

    for (const waypoint of optimizationDto.waypoints) {
      if (!this.isValidCoordinate(waypoint.location)) {
        throw new BadRequestException('All waypoints must have valid coordinates');
      }
    }

    const optimizedRoute = await this.mapsService.optimizeRoute(optimizationDto.waypoints);

    return {
      optimizedRoute,
      summary: {
        totalDistance: `${(optimizedRoute.totalDistance / 1000).toFixed(2)} km`,
        totalDuration: `${Math.round(optimizedRoute.totalDuration / 60)} minutes`,
        waypoints: optimizedRoute.waypoints.length,
        estimatedCompletion: optimizedRoute.waypoints[optimizedRoute.waypoints.length - 1]?.estimatedArrival,
      },
    };
  }

  @Post('eta/calculate')
  @ApiOperation({ summary: 'Calculate estimated time of arrival' })
  @ApiResponse({ status: 200, description: 'ETA calculation successful' })
  async calculateETA(@Body() etaDto: ETACalculationDto) {
    if (!this.isValidCoordinate(etaDto.origin) || !this.isValidCoordinate(etaDto.destination)) {
      throw new BadRequestException('Valid origin and destination coordinates are required');
    }

    let departureTime: Date | undefined;
    if (etaDto.departureTime) {
      departureTime = new Date(etaDto.departureTime);
      if (isNaN(departureTime.getTime())) {
        throw new BadRequestException('Invalid departure time format');
      }
    }

    const eta = await this.mapsService.calculateETA(
      etaDto.origin,
      etaDto.destination,
      departureTime,
    );

    return {
      eta,
      summary: {
        estimatedArrival: eta.estimatedArrival.toISOString(),
        durationWithTraffic: `${Math.round(eta.durationWithTraffic / 60)} minutes`,
        trafficDelay: `${Math.round(eta.trafficDelay / 60)} minutes`,
        confidence: eta.confidence,
      },
    };
  }

  @Post('traffic/info')
  @ApiOperation({ summary: 'Get traffic information for route' })
  @ApiResponse({ status: 200, description: 'Traffic information retrieved' })
  async getTrafficInfo(@Body() trafficDto: TrafficInfoDto) {
    if (!this.isValidCoordinate(trafficDto.origin) || !this.isValidCoordinate(trafficDto.destination)) {
      throw new BadRequestException('Valid origin and destination coordinates are required');
    }

    const trafficInfo = await this.mapsService.getTrafficInfo(
      trafficDto.origin,
      trafficDto.destination,
    );

    return {
      trafficInfo,
      recommendation: this.getTrafficRecommendation(trafficInfo),
    };
  }

  @Get('vehicles/nearby')
  @ApiOperation({ summary: 'Find nearby vehicles' })
  @ApiResponse({ status: 200, description: 'Nearby vehicles found' })
  async findNearbyVehicles(@Query() query: NearbyVehiclesDto) {
    if (!this.isValidCoordinate({ latitude: query.latitude, longitude: query.longitude })) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }

    const radiusKm = query.radiusKm && query.radiusKm > 0 ? query.radiusKm : 10;
    if (radiusKm > 100) {
      throw new BadRequestException('Radius cannot exceed 100 km');
    }

    const nearbyVehicles = await this.mapsService.findNearbyVehicles(
      { latitude: query.latitude, longitude: query.longitude },
      radiusKm,
    );

    return {
      searchLocation: {
        latitude: query.latitude,
        longitude: query.longitude,
      },
      radiusKm,
      vehicles: nearbyVehicles,
      count: nearbyVehicles.length,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Maps service health' })
  @ApiResponse({ status: 200, description: 'Maps service health status' })
  async getHealth() {
    // Simple health check - try to geocode a known address
    try {
      await this.mapsService.geocodeAddress('Mumbai, India');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Google Maps API',
      };
    } catch (error) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        service: 'Google Maps API',
        error: 'Using mock responses',
      };
    }
  }

  private isValidCoordinate(coord: any): boolean {
    return (
      coord &&
      typeof coord.latitude === 'number' &&
      typeof coord.longitude === 'number' &&
      coord.latitude >= -90 &&
      coord.latitude <= 90 &&
      coord.longitude >= -180 &&
      coord.longitude <= 180
    );
  }

  private getTrafficRecommendation(trafficInfo: any): string {
    switch (trafficInfo.currentConditions) {
      case 'severe':
        return 'Consider delaying departure or using alternative routes. Significant delays expected.';
      case 'heavy':
        return 'Heavy traffic detected. Allow extra time for delivery.';
      case 'moderate':
        return 'Moderate traffic. Minor delays possible.';
      case 'light':
      default:
        return 'Traffic conditions are favorable for delivery.';
    }
  }
}