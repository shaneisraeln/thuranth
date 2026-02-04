import { cacheManager } from './cache-manager';
import { CacheKeys, CacheTTL } from './cache-keys';
import { User, UserRole } from '@pdcp/types';

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserPermissions {
  canViewDashboard: boolean;
  canManageParcels: boolean;
  canManageVehicles: boolean;
  canOverrideDecisions: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canAccessAuditLogs: boolean;
}

export class SessionCache {
  /**
   * Create and cache user session
   */
  async createSession(sessionId: string, session: UserSession): Promise<void> {
    const key = CacheKeys.userSession(sessionId);
    await cacheManager.set(key, session, { ttl: CacheTTL.USER_SESSION });
  }

  /**
   * Get user session
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    const key = CacheKeys.userSession(sessionId);
    return cacheManager.get(key);
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      const key = CacheKeys.userSession(sessionId);
      await cacheManager.set(key, session, { ttl: CacheTTL.USER_SESSION });
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string): Promise<boolean> {
    const key = CacheKeys.userSession(sessionId);
    const exists = await cacheManager.exists(key);
    
    if (exists) {
      await cacheManager.expire(key, CacheTTL.USER_SESSION);
      return true;
    }
    
    return false;
  }

  /**
   * Delete user session (logout)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = CacheKeys.userSession(sessionId);
    await cacheManager.del(key);
  }

  /**
   * Cache user permissions
   */
  async setUserPermissions(userId: string, permissions: UserPermissions): Promise<void> {
    const key = CacheKeys.userPermissions(userId);
    await cacheManager.set(key, permissions, { ttl: CacheTTL.USER_PERMISSIONS });
  }

  /**
   * Get cached user permissions
   */
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    const key = CacheKeys.userPermissions(userId);
    return cacheManager.get(key);
  }

  /**
   * Generate default permissions based on user role
   */
  generatePermissions(role: UserRole): UserPermissions {
    switch (role) {
      case 'ADMIN':
        return {
          canViewDashboard: true,
          canManageParcels: true,
          canManageVehicles: true,
          canOverrideDecisions: true,
          canViewAnalytics: true,
          canManageUsers: true,
          canAccessAuditLogs: true,
        };
      
      case 'DISPATCHER':
        return {
          canViewDashboard: true,
          canManageParcels: true,
          canManageVehicles: true,
          canOverrideDecisions: true,
          canViewAnalytics: true,
          canManageUsers: false,
          canAccessAuditLogs: false,
        };
      
      case 'DRIVER':
        return {
          canViewDashboard: false,
          canManageParcels: false,
          canManageVehicles: false,
          canOverrideDecisions: false,
          canViewAnalytics: false,
          canManageUsers: false,
          canAccessAuditLogs: false,
        };
      
      default:
        return {
          canViewDashboard: false,
          canManageParcels: false,
          canManageVehicles: false,
          canOverrideDecisions: false,
          canViewAnalytics: false,
          canManageUsers: false,
          canAccessAuditLogs: false,
        };
    }
  }

  /**
   * Update user last activity timestamp
   */
  async updateUserActivity(userId: string): Promise<void> {
    const key = CacheKeys.userLastActivity(userId);
    await cacheManager.set(key, new Date(), { ttl: CacheTTL.USER_SESSION });
  }

  /**
   * Get user last activity
   */
  async getUserLastActivity(userId: string): Promise<Date | null> {
    const key = CacheKeys.userLastActivity(userId);
    return cacheManager.get(key);
  }

  /**
   * Implement rate limiting for user actions
   */
  async checkRateLimit(userId: string, endpoint: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = CacheKeys.rateLimitUser(userId, endpoint);
    const current = await cacheManager.incr(key);
    
    if (current === 1) {
      // First request in window, set expiration
      await cacheManager.expire(key, windowSeconds);
    }
    
    const ttl = await cacheManager.ttl(key);
    const resetTime = new Date(Date.now() + (ttl * 1000));
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime,
    };
  }

  /**
   * Implement rate limiting for IP addresses
   */
  async checkIPRateLimit(ip: string, endpoint: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = CacheKeys.rateLimitIP(ip, endpoint);
    const current = await cacheManager.incr(key);
    
    if (current === 1) {
      // First request in window, set expiration
      await cacheManager.expire(key, windowSeconds);
    }
    
    const ttl = await cacheManager.ttl(key);
    const resetTime = new Date(Date.now() + (ttl * 1000));
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime,
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<string[]> {
    // This would require scanning all session keys, which is expensive
    // In production, consider maintaining a separate set of active sessions per user
    const pattern = 'session:*';
    const keys = await cacheManager.getClient().keys(pattern);
    
    const activeSessions: string[] = [];
    
    for (const key of keys) {
      const session = await cacheManager.get<UserSession>(key);
      if (session && session.userId === userId) {
        const sessionId = key.replace('session:', '');
        activeSessions.push(sessionId);
      }
    }
    
    return activeSessions;
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    const activeSessions = await this.getUserActiveSessions(userId);
    
    for (const sessionId of activeSessions) {
      await this.deleteSession(sessionId);
    }
    
    // Also clear user permissions cache
    const permissionsKey = CacheKeys.userPermissions(userId);
    await cacheManager.del(permissionsKey);
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const pattern = 'session:*';
    const keys = await cacheManager.getClient().keys(pattern);
    
    let cleanedCount = 0;
    
    for (const key of keys) {
      const ttl = await cacheManager.ttl(key);
      if (ttl === -2) { // Key doesn't exist
        cleanedCount++;
      } else if (ttl === -1) { // Key exists but has no expiration
        // Set expiration for keys without TTL
        await cacheManager.expire(key, CacheTTL.USER_SESSION);
      }
    }
    
    return cleanedCount;
  }
}

export const sessionCache = new SessionCache();