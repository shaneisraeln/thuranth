import { cacheManager } from './cache-manager';
import { CacheKeys, CacheTTL } from './cache-keys';
import { Parcel, ParcelStatus } from '@pdcp/types';

export class ParcelCache {
  /**
   * Cache parcel details
   */
  async setParcelDetails(parcelId: string, parcel: Parcel): Promise<void> {
    const key = CacheKeys.parcelDetails(parcelId);
    await cacheManager.set(key, parcel, { ttl: CacheTTL.PARCEL_STATUS });
  }

  /**
   * Get cached parcel details
   */
  async getParcelDetails(parcelId: string): Promise<Parcel | null> {
    const key = CacheKeys.parcelDetails(parcelId);
    return cacheManager.get(key);
  }

  /**
   * Cache parcel status
   */
  async setParcelStatus(parcelId: string, status: ParcelStatus): Promise<void> {
    const key = CacheKeys.parcelStatus(parcelId);
    await cacheManager.set(key, status, { ttl: CacheTTL.PARCEL_STATUS });
  }

  /**
   * Get cached parcel status
   */
  async getParcelStatus(parcelId: string): Promise<ParcelStatus | null> {
    const key = CacheKeys.parcelStatus(parcelId);
    return cacheManager.get(key);
  }

  /**
   * Add parcel to pending queue
   */
  async addToPendingQueue(parcel: { id: string; priority: string; slaDeadline: Date }): Promise<void> {
    const key = CacheKeys.pendingParcels();
    await cacheManager.lpush(key, parcel);
  }

  /**
   * Get next parcel from pending queue
   */
  async getNextPendingParcel(): Promise<{ id: string; priority: string; slaDeadline: Date } | null> {
    const key = CacheKeys.pendingParcels();
    return cacheManager.rpop(key);
  }

  /**
   * Get pending queue length
   */
  async getPendingQueueLength(): Promise<number> {
    const key = CacheKeys.pendingParcels();
    return cacheManager.llen(key);
  }

  /**
   * Get pending parcels (without removing them)
   */
  async getPendingParcels(start = 0, end = -1): Promise<{ id: string; priority: string; slaDeadline: Date }[]> {
    const key = CacheKeys.pendingParcels();
    return cacheManager.lrange(key, start, end);
  }

  /**
   * Cache parcels assigned to a vehicle
   */
  async setParcelsByVehicle(vehicleId: string, parcelIds: string[]): Promise<void> {
    const key = CacheKeys.parcelsByVehicle(vehicleId);
    await cacheManager.del(key); // Clear existing set
    
    if (parcelIds.length > 0) {
      await cacheManager.sadd(key, ...parcelIds);
      await cacheManager.expire(key, CacheTTL.VEHICLE_CAPACITY);
    }
  }

  /**
   * Add parcel to vehicle assignment
   */
  async addParcelToVehicle(vehicleId: string, parcelId: string): Promise<void> {
    const key = CacheKeys.parcelsByVehicle(vehicleId);
    await cacheManager.sadd(key, parcelId);
    await cacheManager.expire(key, CacheTTL.VEHICLE_CAPACITY);
  }

  /**
   * Remove parcel from vehicle assignment
   */
  async removeParcelFromVehicle(vehicleId: string, parcelId: string): Promise<void> {
    const key = CacheKeys.parcelsByVehicle(vehicleId);
    await cacheManager.srem(key, parcelId);
  }

  /**
   * Get parcels assigned to a vehicle
   */
  async getParcelsByVehicle(vehicleId: string): Promise<string[]> {
    const key = CacheKeys.parcelsByVehicle(vehicleId);
    return cacheManager.smembers(key);
  }

  /**
   * Check if parcel is assigned to vehicle
   */
  async isParcelAssignedToVehicle(vehicleId: string, parcelId: string): Promise<boolean> {
    const key = CacheKeys.parcelsByVehicle(vehicleId);
    return cacheManager.sismember(key, parcelId);
  }

  /**
   * Cache parcel assignment information
   */
  async setParcelAssignment(parcelId: string, assignment: { vehicleId: string; assignedAt: Date; estimatedDelivery: Date }): Promise<void> {
    const key = CacheKeys.parcelAssignment(parcelId);
    await cacheManager.set(key, assignment, { ttl: CacheTTL.PARCEL_STATUS });
  }

  /**
   * Get cached parcel assignment
   */
  async getParcelAssignment(parcelId: string): Promise<{ vehicleId: string; assignedAt: Date; estimatedDelivery: Date } | null> {
    const key = CacheKeys.parcelAssignment(parcelId);
    return cacheManager.get(key);
  }

  /**
   * Remove parcel assignment from cache
   */
  async removeParcelAssignment(parcelId: string): Promise<void> {
    const key = CacheKeys.parcelAssignment(parcelId);
    await cacheManager.del(key);
  }

  /**
   * Invalidate all cache entries for a parcel
   */
  async invalidateParcelCache(parcelId: string): Promise<void> {
    const keys = [
      CacheKeys.parcelDetails(parcelId),
      CacheKeys.parcelStatus(parcelId),
      CacheKeys.parcelAssignment(parcelId),
    ];
    
    await cacheManager.delMultiple(keys);
  }

  /**
   * Get multiple parcel statuses at once
   */
  async getMultipleParcelStatuses(parcelIds: string[]): Promise<Record<string, ParcelStatus | null>> {
    const keys = parcelIds.map(id => CacheKeys.parcelStatus(id));
    const statuses = await cacheManager.mget<ParcelStatus>(keys);
    
    const result: Record<string, ParcelStatus | null> = {};
    parcelIds.forEach((id, index) => {
      result[id] = statuses[index];
    });
    
    return result;
  }

  /**
   * Set multiple parcel statuses at once
   */
  async setMultipleParcelStatuses(statusUpdates: Record<string, ParcelStatus>): Promise<void> {
    const keyValuePairs: Record<string, any> = {};
    
    for (const [parcelId, status] of Object.entries(statusUpdates)) {
      const key = CacheKeys.parcelStatus(parcelId);
      keyValuePairs[key] = status;
    }
    
    await cacheManager.mset(keyValuePairs);
    
    // Set TTL for each key
    for (const parcelId of Object.keys(statusUpdates)) {
      const key = CacheKeys.parcelStatus(parcelId);
      await cacheManager.expire(key, CacheTTL.PARCEL_STATUS);
    }
  }

  /**
   * Acquire lock for parcel assignment
   */
  async acquireAssignmentLock(parcelId: string): Promise<boolean> {
    const key = CacheKeys.lockParcelAssignment(parcelId);
    return cacheManager.setNX(key, { locked: true, timestamp: new Date() }, CacheTTL.ASSIGNMENT_LOCK);
  }

  /**
   * Release lock for parcel assignment
   */
  async releaseAssignmentLock(parcelId: string): Promise<void> {
    const key = CacheKeys.lockParcelAssignment(parcelId);
    await cacheManager.del(key);
  }
}

export const parcelCache = new ParcelCache();