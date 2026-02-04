import { cacheManager } from './cache-manager';
import { CacheKeys, CacheTTL } from './cache-keys';
import { DecisionResponse, VehicleOption } from '@pdcp/types';

export class DecisionCache {
  /**
   * Cache decision result for a parcel-vehicle combination
   */
  async setDecisionResult(parcelId: string, vehicleId: string, decision: DecisionResponse): Promise<void> {
    const key = CacheKeys.decisionResult(parcelId, vehicleId);
    await cacheManager.set(key, decision, { ttl: CacheTTL.DECISION_RESULT });
  }

  /**
   * Get cached decision result
   */
  async getDecisionResult(parcelId: string, vehicleId: string): Promise<DecisionResponse | null> {
    const key = CacheKeys.decisionResult(parcelId, vehicleId);
    return cacheManager.get(key);
  }

  /**
   * Cache decision result by hash (for similar requests)
   */
  async setCachedDecision(hash: string, decision: DecisionResponse): Promise<void> {
    const key = CacheKeys.decisionCache(hash);
    await cacheManager.set(key, decision, { ttl: CacheTTL.DECISION_RESULT });
  }

  /**
   * Get cached decision by hash
   */
  async getCachedDecision(hash: string): Promise<DecisionResponse | null> {
    const key = CacheKeys.decisionCache(hash);
    return cacheManager.get(key);
  }

  /**
   * Cache eligible vehicles for a parcel
   */
  async setEligibleVehicles(parcelId: string, vehicles: VehicleOption[]): Promise<void> {
    const key = CacheKeys.eligibleVehicles(parcelId);
    await cacheManager.set(key, vehicles, { ttl: CacheTTL.ELIGIBLE_VEHICLES });
  }

  /**
   * Get cached eligible vehicles
   */
  async getEligibleVehicles(parcelId: string): Promise<VehicleOption[] | null> {
    const key = CacheKeys.eligibleVehicles(parcelId);
    return cacheManager.get(key);
  }

  /**
   * Remove eligible vehicles cache for a parcel
   */
  async removeEligibleVehicles(parcelId: string): Promise<void> {
    const key = CacheKeys.eligibleVehicles(parcelId);
    await cacheManager.del(key);
  }

  /**
   * Cache decision statistics for analytics
   */
  async incrementDecisionCounter(type: 'successful' | 'failed' | 'shadow_mode'): Promise<number> {
    const key = `decision:stats:${type}:${new Date().toISOString().split('T')[0]}`;
    const count = await cacheManager.incr(key);
    
    // Set expiration for daily counters
    if (count === 1) {
      await cacheManager.expire(key, CacheTTL.DAILY_METRICS);
    }
    
    return count;
  }

  /**
   * Get decision statistics for a date
   */
  async getDecisionStats(date: string): Promise<{ successful: number; failed: number; shadow_mode: number }> {
    const keys = [
      `decision:stats:successful:${date}`,
      `decision:stats:failed:${date}`,
      `decision:stats:shadow_mode:${date}`,
    ];
    
    const [successful, failed, shadowMode] = await cacheManager.mget<number>(keys);
    
    return {
      successful: successful || 0,
      failed: failed || 0,
      shadow_mode: shadowMode || 0,
    };
  }

  /**
   * Cache decision performance metrics
   */
  async setDecisionPerformance(metrics: {
    avgDecisionTime: number;
    totalDecisions: number;
    successRate: number;
    timestamp: Date;
  }): Promise<void> {
    const key = 'decision:performance:current';
    await cacheManager.set(key, metrics, { ttl: CacheTTL.REAL_TIME_METRICS });
  }

  /**
   * Get cached decision performance metrics
   */
  async getDecisionPerformance(): Promise<{
    avgDecisionTime: number;
    totalDecisions: number;
    successRate: number;
    timestamp: Date;
  } | null> {
    const key = 'decision:performance:current';
    return cacheManager.get(key);
  }

  /**
   * Invalidate all decision cache for a parcel
   */
  async invalidateParcelDecisionCache(parcelId: string): Promise<void> {
    // Remove eligible vehicles cache
    await this.removeEligibleVehicles(parcelId);
    
    // Remove decision results cache (pattern-based deletion)
    const pattern = `decision:result:${parcelId}:*`;
    await cacheManager.deletePattern(pattern);
  }

  /**
   * Invalidate all decision cache for a vehicle
   */
  async invalidateVehicleDecisionCache(vehicleId: string): Promise<void> {
    // Remove decision results cache (pattern-based deletion)
    const pattern = `decision:result:*:${vehicleId}`;
    await cacheManager.deletePattern(pattern);
  }

  /**
   * Cache shadow mode comparison results
   */
  async setShadowModeComparison(parcelId: string, comparison: {
    shadowDecision: DecisionResponse;
    actualDecision: DecisionResponse;
    accuracy: number;
    timestamp: Date;
  }): Promise<void> {
    const key = `shadow:comparison:${parcelId}`;
    await cacheManager.set(key, comparison, { ttl: CacheTTL.DAILY_METRICS });
  }

  /**
   * Get shadow mode comparison results
   */
  async getShadowModeComparison(parcelId: string): Promise<{
    shadowDecision: DecisionResponse;
    actualDecision: DecisionResponse;
    accuracy: number;
    timestamp: Date;
  } | null> {
    const key = `shadow:comparison:${parcelId}`;
    return cacheManager.get(key);
  }

  /**
   * Generate cache key hash for decision request
   */
  generateDecisionHash(request: {
    parcelId: string;
    pickupLocation: { latitude: number; longitude: number };
    deliveryLocation: { latitude: number; longitude: number };
    weight: number;
    priority: string;
  }): string {
    const hashInput = `${request.parcelId}-${request.pickupLocation.latitude.toFixed(4)}-${request.pickupLocation.longitude.toFixed(4)}-${request.deliveryLocation.latitude.toFixed(4)}-${request.deliveryLocation.longitude.toFixed(4)}-${request.weight}-${request.priority}`;
    
    // Simple hash function (in production, use a proper hash library)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
}

export const decisionCache = new DecisionCache();