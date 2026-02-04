interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

interface RoutePoint {
  id: string;
  parcelId: string;
  address: string;
  location: GeoCoordinate;
  type: 'pickup' | 'delivery';
  estimatedTime: string;
  completed: boolean;
  sequence: number;
}

interface DirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      steps: Array<{
        distance: {
          text: string;
          value: number;
        };
        duration: {
          text: string;
          value: number;
        };
        end_location: {
          lat: number;
          lng: number;
        };
        html_instructions: string;
        polyline: {
          points: string;
        };
        start_location: {
          lat: number;
          lng: number;
        };
        travel_mode: string;
      }>;
    }>;
    overview_polyline: {
      points: string;
    };
  }>;
  status: string;
}

export class GoogleMapsService {
  private static instance: GoogleMapsService;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  public static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  public async getDirections(
    origin: GeoCoordinate,
    destination: GeoCoordinate,
    waypoints?: GeoCoordinate[]
  ): Promise<DirectionsResponse | null> {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      
      let waypointsStr = '';
      if (waypoints && waypoints.length > 0) {
        waypointsStr = waypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('|');
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${originStr}&` +
        `destination=${destinationStr}&` +
        `${waypointsStr ? `waypoints=${waypointsStr}&` : ''}` +
        `optimize=true&` +
        `mode=driving&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DirectionsResponse = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }

  public async optimizeRoute(
    currentLocation: GeoCoordinate,
    routePoints: RoutePoint[]
  ): Promise<RoutePoint[]> {
    try {
      // Filter out completed points
      const pendingPoints = routePoints.filter(point => !point.completed);
      
      if (pendingPoints.length === 0) {
        return routePoints;
      }

      if (pendingPoints.length === 1) {
        return routePoints;
      }

      // Use Google Directions API with waypoint optimization
      const waypoints = pendingPoints.slice(0, -1).map(point => point.location);
      const destination = pendingPoints[pendingPoints.length - 1].location;

      const directions = await this.getDirections(
        currentLocation,
        destination,
        waypoints
      );

      if (!directions || !directions.routes[0]) {
        // Return original order if optimization fails
        return routePoints;
      }

      // Google's optimization returns waypoint order in the route
      // For now, we'll implement a simple distance-based optimization
      const optimizedPoints = this.optimizeByDistance(currentLocation, pendingPoints);
      
      // Combine completed points (keep original order) with optimized pending points
      const completedPoints = routePoints.filter(point => point.completed);
      
      // Update sequence numbers
      const finalRoute = [
        ...completedPoints,
        ...optimizedPoints.map((point, index) => ({
          ...point,
          sequence: completedPoints.length + index + 1,
        }))
      ];

      return finalRoute;
    } catch (error) {
      console.error('Error optimizing route:', error);
      return routePoints;
    }
  }

  private optimizeByDistance(
    currentLocation: GeoCoordinate,
    points: RoutePoint[]
  ): RoutePoint[] {
    if (points.length <= 1) return points;

    const optimized: RoutePoint[] = [];
    const remaining = [...points];
    let currentPos = currentLocation;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = this.calculateDistance(currentPos, remaining[0].location);

      // Find nearest point
      for (let i = 1; i < remaining.length; i++) {
        const distance = this.calculateDistance(currentPos, remaining[i].location);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Add nearest point to optimized route
      const nearestPoint = remaining.splice(nearestIndex, 1)[0];
      optimized.push(nearestPoint);
      currentPos = nearestPoint.location;
    }

    return optimized;
  }

  public async calculateETA(
    origin: GeoCoordinate,
    destination: GeoCoordinate
  ): Promise<{duration: number; distance: number} | null> {
    try {
      const directions = await this.getDirections(origin, destination);
      
      if (!directions || !directions.routes[0] || !directions.routes[0].legs[0]) {
        return null;
      }

      const leg = directions.routes[0].legs[0];
      return {
        duration: leg.duration.value, // in seconds
        distance: leg.distance.value, // in meters
      };
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }

  public async geocodeAddress(address: string): Promise<GeoCoordinate | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(address)}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results[0]) {
        throw new Error(`Geocoding error: ${data.status}`);
      }

      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  public async reverseGeocode(location: GeoCoordinate): Promise<string | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${location.latitude},${location.longitude}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results[0]) {
        throw new Error(`Reverse geocoding error: ${data.status}`);
      }

      return data.results[0].formatted_address;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  private calculateDistance(
    from: GeoCoordinate,
    to: GeoCoordinate
  ): number {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) * Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}