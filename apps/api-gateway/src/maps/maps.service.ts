import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress?: string;
}

export interface RouteWaypoint {
  location: GeoCoordinate;
  address?: string;
  stopType: 'pickup' | 'delivery' | 'waypoint';
  parcelId?: string;
  estimatedArrival?: Date;
  duration?: number; // seconds from previous waypoint
  distance?: number; // meters from previous waypoint
}

export interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  overview: {
    bounds: {
      northeast: GeoCoordinate;
      southwest: GeoCoordinate;
    };
    polyline: string;
  };
  legs: RouteLeg[];
}

export interface RouteLeg {
  startLocation: GeoCoordinate;
  endLocation: GeoCoordinate;
  distance: number; // meters
  duration: number; // seconds
  durationInTraffic?: number; // seconds with traffic
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: GeoCoordinate;
  endLocation: GeoCoordinate;
  polyline: string;
}

export interface TrafficInfo {
  currentConditions: 'light' | 'moderate' | 'heavy' | 'severe';
  delayMinutes: number;
  alternativeRoutes: number;
}

export interface ETACalculation {
  estimatedArrival: Date;
  durationWithTraffic: number; // seconds
  durationWithoutTraffic: number; // seconds
  trafficDelay: number; // seconds
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('Google Maps API key not configured, using mock responses');
    }
  }

  async geocodeAddress(address: string): Promise<GeoCoordinate> {
    if (!this.apiKey) {
      return this.mockGeocode(address);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new BadRequestException(`Geocoding failed: ${response.data.status}`);
      }

      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } catch (error) {
      this.logger.error(`Geocoding error: ${error.message}`);
      throw new BadRequestException('Failed to geocode address');
    }
  }

  async reverseGeocode(coordinate: GeoCoordinate): Promise<Address> {
    if (!this.apiKey) {
      return this.mockReverseGeocode(coordinate);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${coordinate.latitude},${coordinate.longitude}`,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new BadRequestException(`Reverse geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      const components = result.address_components;

      return {
        street: this.extractAddressComponent(components, 'route') || '',
        city: this.extractAddressComponent(components, 'locality') || 
              this.extractAddressComponent(components, 'administrative_area_level_2') || '',
        state: this.extractAddressComponent(components, 'administrative_area_level_1') || '',
        postalCode: this.extractAddressComponent(components, 'postal_code') || '',
        country: this.extractAddressComponent(components, 'country') || '',
        formattedAddress: result.formatted_address,
      };
    } catch (error) {
      this.logger.error(`Reverse geocoding error: ${error.message}`);
      throw new BadRequestException('Failed to reverse geocode coordinates');
    }
  }

  async calculateRoute(
    origin: GeoCoordinate,
    destination: GeoCoordinate,
    waypoints?: GeoCoordinate[]
  ): Promise<OptimizedRoute> {
    if (!this.apiKey) {
      return this.mockRoute(origin, destination, waypoints);
    }

    try {
      const params: any = {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: this.apiKey,
        units: 'metric',
        departure_time: 'now',
        traffic_model: 'best_guess',
      };

      if (waypoints && waypoints.length > 0) {
        params.waypoints = waypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('|');
        params.optimize_waypoints = true;
      }

      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params,
      });

      if (response.data.status !== 'OK' || !response.data.routes.length) {
        throw new BadRequestException(`Route calculation failed: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      return this.parseGoogleRoute(route);
    } catch (error) {
      this.logger.error(`Route calculation error: ${error.message}`);
      throw new BadRequestException('Failed to calculate route');
    }
  }

  async optimizeRoute(waypoints: RouteWaypoint[]): Promise<OptimizedRoute> {
    if (waypoints.length < 2) {
      throw new BadRequestException('At least 2 waypoints required for route optimization');
    }

    const origin = waypoints[0].location;
    const destination = waypoints[waypoints.length - 1].location;
    const intermediateWaypoints = waypoints.slice(1, -1).map(wp => wp.location);

    const optimizedRoute = await this.calculateRoute(origin, destination, intermediateWaypoints);

    // Map the optimized waypoints back to the original waypoint data
    optimizedRoute.waypoints = waypoints.map((wp, index) => ({
      ...wp,
      estimatedArrival: this.calculateWaypointETA(optimizedRoute, index),
    }));

    return optimizedRoute;
  }

  async calculateETA(
    origin: GeoCoordinate,
    destination: GeoCoordinate,
    departureTime?: Date
  ): Promise<ETACalculation> {
    if (!this.apiKey) {
      return this.mockETA(origin, destination);
    }

    try {
      const params: any = {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        key: this.apiKey,
        units: 'metric',
        departure_time: departureTime ? 
          Math.floor(departureTime.getTime() / 1000) : 'now',
        traffic_model: 'best_guess',
      };

      const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
        params,
      });

      if (response.data.status !== 'OK') {
        throw new BadRequestException(`ETA calculation failed: ${response.data.status}`);
      }

      const element = response.data.rows[0].elements[0];
      if (element.status !== 'OK') {
        throw new BadRequestException(`ETA calculation failed: ${element.status}`);
      }

      const durationWithTraffic = element.duration_in_traffic?.value || element.duration.value;
      const durationWithoutTraffic = element.duration.value;
      const trafficDelay = durationWithTraffic - durationWithoutTraffic;

      return {
        estimatedArrival: new Date(Date.now() + durationWithTraffic * 1000),
        durationWithTraffic,
        durationWithoutTraffic,
        trafficDelay,
        confidence: trafficDelay > 300 ? 'low' : trafficDelay > 60 ? 'medium' : 'high',
      };
    } catch (error) {
      this.logger.error(`ETA calculation error: ${error.message}`);
      throw new BadRequestException('Failed to calculate ETA');
    }
  }

  async getTrafficInfo(
    origin: GeoCoordinate,
    destination: GeoCoordinate
  ): Promise<TrafficInfo> {
    const eta = await this.calculateETA(origin, destination);
    const delayMinutes = Math.round(eta.trafficDelay / 60);

    let currentConditions: TrafficInfo['currentConditions'] = 'light';
    if (delayMinutes > 15) currentConditions = 'severe';
    else if (delayMinutes > 10) currentConditions = 'heavy';
    else if (delayMinutes > 5) currentConditions = 'moderate';

    return {
      currentConditions,
      delayMinutes,
      alternativeRoutes: Math.floor(Math.random() * 3) + 1, // Mock alternative routes
    };
  }

  async findNearbyVehicles(
    location: GeoCoordinate,
    radiusKm: number = 10
  ): Promise<GeoCoordinate[]> {
    // This would typically query the vehicle tracking service
    // For now, return mock nearby vehicles
    const vehicles: GeoCoordinate[] = [];
    const count = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < count; i++) {
      vehicles.push({
        latitude: location.latitude + (Math.random() - 0.5) * (radiusKm / 111), // Rough km to degree conversion
        longitude: location.longitude + (Math.random() - 0.5) * (radiusKm / 111),
      });
    }

    return vehicles;
  }

  private parseGoogleRoute(googleRoute: any): OptimizedRoute {
    const legs: RouteLeg[] = googleRoute.legs.map((leg: any) => ({
      startLocation: {
        latitude: leg.start_location.lat,
        longitude: leg.start_location.lng,
      },
      endLocation: {
        latitude: leg.end_location.lat,
        longitude: leg.end_location.lng,
      },
      distance: leg.distance.value,
      duration: leg.duration.value,
      durationInTraffic: leg.duration_in_traffic?.value,
      steps: leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
        distance: step.distance.value,
        duration: step.duration.value,
        startLocation: {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        },
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
        polyline: step.polyline.points,
      })),
    }));

    return {
      waypoints: [], // Will be populated by caller
      totalDistance: legs.reduce((sum, leg) => sum + leg.distance, 0),
      totalDuration: legs.reduce((sum, leg) => sum + leg.duration, 0),
      overview: {
        bounds: {
          northeast: {
            latitude: googleRoute.bounds.northeast.lat,
            longitude: googleRoute.bounds.northeast.lng,
          },
          southwest: {
            latitude: googleRoute.bounds.southwest.lat,
            longitude: googleRoute.bounds.southwest.lng,
          },
        },
        polyline: googleRoute.overview_polyline.points,
      },
      legs,
    };
  }

  private calculateWaypointETA(route: OptimizedRoute, waypointIndex: number): Date {
    let cumulativeDuration = 0;
    for (let i = 0; i < waypointIndex && i < route.legs.length; i++) {
      cumulativeDuration += route.legs[i].duration;
    }
    return new Date(Date.now() + cumulativeDuration * 1000);
  }

  private extractAddressComponent(components: any[], type: string): string | null {
    const component = components.find(comp => comp.types.includes(type));
    return component ? component.long_name : null;
  }

  // Mock methods for development without API key
  private mockGeocode(address: string): GeoCoordinate {
    // Return mock coordinates for common Indian cities
    const mockLocations: Record<string, GeoCoordinate> = {
      'mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'delhi': { latitude: 28.7041, longitude: 77.1025 },
      'bangalore': { latitude: 12.9716, longitude: 77.5946 },
      'chennai': { latitude: 13.0827, longitude: 80.2707 },
      'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
    };

    const city = address.toLowerCase();
    for (const [key, location] of Object.entries(mockLocations)) {
      if (city.includes(key)) {
        return location;
      }
    }

    // Default to Mumbai
    return mockLocations.mumbai;
  }

  private mockReverseGeocode(coordinate: GeoCoordinate): Address {
    return {
      street: 'Mock Street',
      city: 'Mock City',
      state: 'Mock State',
      postalCode: '400001',
      country: 'India',
      formattedAddress: `Mock Street, Mock City, Mock State 400001, India`,
    };
  }

  private mockRoute(
    origin: GeoCoordinate,
    destination: GeoCoordinate,
    waypoints?: GeoCoordinate[]
  ): OptimizedRoute {
    const distance = this.calculateDistance(origin, destination);
    const duration = Math.round(distance * 60); // Assume 1 km per minute

    return {
      waypoints: [],
      totalDistance: distance * 1000, // Convert to meters
      totalDuration: duration,
      overview: {
        bounds: {
          northeast: {
            latitude: Math.max(origin.latitude, destination.latitude),
            longitude: Math.max(origin.longitude, destination.longitude),
          },
          southwest: {
            latitude: Math.min(origin.latitude, destination.latitude),
            longitude: Math.min(origin.longitude, destination.longitude),
          },
        },
        polyline: 'mock_polyline_string',
      },
      legs: [{
        startLocation: origin,
        endLocation: destination,
        distance: distance * 1000,
        duration: duration,
        steps: [{
          instruction: `Head towards destination`,
          distance: distance * 1000,
          duration: duration,
          startLocation: origin,
          endLocation: destination,
          polyline: 'mock_polyline_string',
        }],
      }],
    };
  }

  private mockETA(origin: GeoCoordinate, destination: GeoCoordinate): ETACalculation {
    const distance = this.calculateDistance(origin, destination);
    const durationWithoutTraffic = Math.round(distance * 60); // 1 km per minute
    const trafficDelay = Math.round(Math.random() * 300); // 0-5 minutes delay
    const durationWithTraffic = durationWithoutTraffic + trafficDelay;

    return {
      estimatedArrival: new Date(Date.now() + durationWithTraffic * 1000),
      durationWithTraffic,
      durationWithoutTraffic,
      trafficDelay,
      confidence: 'medium',
    };
  }

  private calculateDistance(point1: GeoCoordinate, point2: GeoCoordinate): number {
    // Validate input coordinates
    if (!point1 || !point2 || 
        isNaN(point1.latitude) || isNaN(point1.longitude) ||
        isNaN(point2.latitude) || isNaN(point2.longitude)) {
      throw new BadRequestException('Invalid coordinates provided for distance calculation');
    }

    // If points are identical, return 0
    if (point1.latitude === point2.latitude && point1.longitude === point2.longitude) {
      return 0;
    }

    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Ensure we return a valid number
    if (isNaN(distance) || !isFinite(distance)) {
      this.logger.warn(`Distance calculation resulted in invalid value for points: ${JSON.stringify(point1)} -> ${JSON.stringify(point2)}`);
      return 0; // Return 0 for invalid calculations
    }
    
    return distance;
  }

  private toRadians(degrees: number): number {
    if (isNaN(degrees) || !isFinite(degrees)) {
      return 0;
    }
    return degrees * (Math.PI / 180);
  }
}