/**
 * Cache key patterns for PDCP system
 * Provides consistent key naming and TTL management
 */

export class CacheKeys {
  // Vehicle-related cache keys
  static vehicleLocation(vehicleId: string): string {
    return `vehicle:location:${vehicleId}`;
  }

  static vehicleCapacity(vehicleId: string): string {
    return `vehicle:capacity:${vehicleId}`;
  }

  static vehicleRoute(vehicleId: string): string {
    return `vehicle:route:${vehicleId}`;
  }

  static vehicleStatus(vehicleId: string): string {
    return `vehicle:status:${vehicleId}`;
  }

  static allVehiclesInArea(lat: number, lng: number, radius: number): string {
    return `vehicles:area:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
  }

  // Parcel-related cache keys
  static parcelDetails(parcelId: string): string {
    return `parcel:details:${parcelId}`;
  }

  static parcelStatus(parcelId: string): string {
    return `parcel:status:${parcelId}`;
  }

  static pendingParcels(): string {
    return 'parcels:pending';
  }

  static parcelsByVehicle(vehicleId: string): string {
    return `parcels:vehicle:${vehicleId}`;
  }

  static parcelAssignment(parcelId: string): string {
    return `parcel:assignment:${parcelId}`;
  }

  // Decision engine cache keys
  static decisionResult(parcelId: string, vehicleId: string): string {
    return `decision:result:${parcelId}:${vehicleId}`;
  }

  static decisionCache(hash: string): string {
    return `decision:cache:${hash}`;
  }

  static eligibleVehicles(parcelId: string): string {
    return `decision:eligible:${parcelId}`;
  }

  // User session cache keys
  static userSession(sessionId: string): string {
    return `session:${sessionId}`;
  }

  static userPermissions(userId: string): string {
    return `user:permissions:${userId}`;
  }

  static userLastActivity(userId: string): string {
    return `user:activity:${userId}`;
  }

  // Route optimization cache keys
  static routeOptimization(vehicleId: string, hash: string): string {
    return `route:optimization:${vehicleId}:${hash}`;
  }

  static routeETA(routeId: string): string {
    return `route:eta:${routeId}`;
  }

  // Analytics cache keys
  static dailyMetrics(date: string): string {
    return `analytics:daily:${date}`;
  }

  static realTimeMetrics(): string {
    return 'analytics:realtime';
  }

  static performanceMetrics(service: string): string {
    return `analytics:performance:${service}`;
  }

  // Geospatial cache keys
  static nearbyVehicles(lat: number, lng: number): string {
    return `geo:vehicles:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  }

  static deliveryZone(zoneId: string): string {
    return `geo:zone:${zoneId}`;
  }

  // Rate limiting keys
  static rateLimitUser(userId: string, endpoint: string): string {
    return `ratelimit:user:${userId}:${endpoint}`;
  }

  static rateLimitIP(ip: string, endpoint: string): string {
    return `ratelimit:ip:${ip}:${endpoint}`;
  }

  // Lock keys for distributed operations
  static lockParcelAssignment(parcelId: string): string {
    return `lock:parcel:assignment:${parcelId}`;
  }

  static lockVehicleCapacity(vehicleId: string): string {
    return `lock:vehicle:capacity:${vehicleId}`;
  }

  static lockRouteOptimization(vehicleId: string): string {
    return `lock:route:optimization:${vehicleId}`;
  }
}

/**
 * Cache TTL (Time To Live) configurations in seconds
 */
export class CacheTTL {
  // Short-lived cache (1-5 minutes)
  static readonly VEHICLE_LOCATION = 60; // 1 minute
  static readonly PARCEL_STATUS = 300; // 5 minutes
  static readonly REAL_TIME_METRICS = 30; // 30 seconds

  // Medium-lived cache (5-30 minutes)
  static readonly VEHICLE_CAPACITY = 300; // 5 minutes
  static readonly DECISION_RESULT = 900; // 15 minutes
  static readonly ROUTE_ETA = 600; // 10 minutes
  static readonly ELIGIBLE_VEHICLES = 1800; // 30 minutes

  // Long-lived cache (30 minutes - 24 hours)
  static readonly USER_PERMISSIONS = 3600; // 1 hour
  static readonly ROUTE_OPTIMIZATION = 7200; // 2 hours
  static readonly DAILY_METRICS = 86400; // 24 hours
  static readonly DELIVERY_ZONE = 43200; // 12 hours

  // Session and security
  static readonly USER_SESSION = 28800; // 8 hours
  static readonly RATE_LIMIT_WINDOW = 3600; // 1 hour

  // Locks (short duration)
  static readonly ASSIGNMENT_LOCK = 30; // 30 seconds
  static readonly CAPACITY_LOCK = 10; // 10 seconds
  static readonly OPTIMIZATION_LOCK = 60; // 1 minute
}