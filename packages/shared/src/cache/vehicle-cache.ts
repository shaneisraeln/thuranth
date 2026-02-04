import { cacheManager } from './cache-manager';
import { CacheKeys, CacheTTL } from './cache-keys';
import { Vehicle, VehicleCapacity, RoutePoint } from '@pdcp/types';

export class VehicleCache {
  /**
   * Cache vehicle location data
   */
  async setVehicleLocation(vehicleId: string, location: { latitude: number; longitude: number; timestamp: Date }): Promise<void> {
    const key = CacheKeys.vehicleLocation(vehicleId);
    await cacheManager.set(key, location, { ttl: CacheTTL.VEHICLE_LOCATION });
  }

  /**
   * Get cached vehicle location
   */
  async getVehicleLocation(vehicleId: string): Promise<{ latitude: number; longitude: number; timestamp: Date } | null> {
    const key = CacheKeys.vehicleLocation(vehicleId);
    return cacheManager.get(key);
  }

  /**
   * Cache vehicle capacity information
   */
  async setVehicleCapacity(vehicleId: string, capacity: VehicleCapacity): Promise<void> {
    const key = CacheKeys.vehicleCapacity(vehicleId);
    await cacheManager.set(key, capacity, { ttl: CacheTTL.VEHICLE_CAPACITY });
  }

  /**
   * Get cached vehicle capacity
   */
  async getVehicleCapacity(vehicleId: string): Promise<VehicleCapacity | null> {
    const key = CacheKeys.vehicleCapacity(vehicleId);
    return cacheManager.get(key);
  }

  /**
   * Cache vehicle route information
   */
  async setVehicleRoute(vehicleId: string, route: RoutePoint[]): Promise<void> {
    const key = CacheKeys.vehicleRoute(vehicleId);
    await cacheManager.set(key, route, { ttl: CacheTTL.ROUTE_ETA });
  }

  /**
   * Get cached vehicle route
   */
  async getVehicleRoute(vehicleId: string): Promise<RoutePoint[] | null> {
    const key = CacheKeys.vehicleRoute(vehicleId);
    return cacheManager.get(key);
  }

  /**
   * Cache vehicle status
   */
  async setVehicleStatus(vehicleId: string, status: string): Promise<void> {
    const key = CacheKeys.vehicleStatus(vehicleId);
    await cacheManager.set(key, status, { ttl: CacheTTL.VEHICLE_CAPACITY });
  }

  /**
   * Get cached vehicle status
   */
  async getVehicleStatus(vehicleId: string): Promise<string | null> {
    const key = CacheKeys.vehicleStatus(vehicleId);
    return cacheManager.get(key);
  }

  /**
   * Cache vehicles in a specific area
   */
  async setVehiclesInArea(lat: number, lng: number, radius: number, vehicleIds: string[]): Promise<void> {
    const key = CacheKeys.allVehiclesInArea(lat, lng, radius);
    await cacheManager.set(key, vehicleIds, { ttl: CacheTTL.ELIGIBLE_VEHICLES });
  }

  /**
   * Get cached vehicles in area
   */
  async getVehiclesInArea(lat: number, lng: number, radius: number): Promise<string[] | null> {
    const key = CacheKeys.allVehiclesInArea(lat, lng, radius);
    return cacheManager.get(key);
  }

  /**
   * Invalidate all cache entries for a vehicle
   */
  async invalidateVehicleCache(vehicleId: string): Promise<void> {
    const keys = [
      CacheKeys.vehicleLocation(vehicleId),
      CacheKeys.vehicleCapacity(vehicleId),
      CacheKeys.vehicleRoute(vehicleId),
      CacheKeys.vehicleStatus(vehicleId),
    ];
    
    await cacheManager.delMultiple(keys);
  }

  /**
   * Get multiple vehicle locations at once
   */
  async getMultipleVehicleLocations(vehicleIds: string[]): Promise<Record<string, { latitude: number; longitude: number; timestamp: Date } | null>> {
    const keys = vehicleIds.map(id => CacheKeys.vehicleLocation(id));
    const locations = await cacheManager.mget<{ latitude: number; longitude: number; timestamp: Date }>(keys);

    const result: Record<string, { latitude: number; longitude: number; timestamp: Date } | null> = {};
    vehicleIds.forEach((id, index) => {
      result[id] = locations[index] as { latitude: number; longitude: number; timestamp: Date } | null;
    });
    
    return result;
  }

  /**
   * Set multiple vehicle locations at once
   */
  async setMultipleVehicleLocations(locationUpdates: Record<string, { latitude: number; longitude: number; timestamp: Date }>): Promise<void> {
    const keyValuePairs: Record<string, any> = {};
    
    for (const [vehicleId, location] of Object.entries(locationUpdates)) {
      const key = CacheKeys.vehicleLocation(vehicleId);
      keyValuePairs[key] = location;
    }
    
    await cacheManager.mset(keyValuePairs);
    
    // Set TTL for each key
    for (const vehicleId of Object.keys(locationUpdates)) {
      const key = CacheKeys.vehicleLocation(vehicleId);
      await cacheManager.expire(key, CacheTTL.VEHICLE_LOCATION);
    }
  }

  /**
   * Acquire lock for vehicle capacity updates
   */
  async acquireCapacityLock(vehicleId: string): Promise<boolean> {
    const key = CacheKeys.lockVehicleCapacity(vehicleId);
    return cacheManager.setNX(key, { locked: true, timestamp: new Date() }, CacheTTL.CAPACITY_LOCK);
  }

  /**
   * Release lock for vehicle capacity updates
   */
  async releaseCapacityLock(vehicleId: string): Promise<void> {
    const key = CacheKeys.lockVehicleCapacity(vehicleId);
    await cacheManager.del(key);
  }
}

export const vehicleCache = new VehicleCache();