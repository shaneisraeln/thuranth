import { redisClient } from './redis-client';
import Redis from 'ioredis';
import { CacheKeys, CacheTTL } from './cache-keys';

export interface CacheOptions {
  ttl?: number;
  serialize?: boolean;
}

export class CacheManager {
  private static instance: CacheManager;
  private client = redisClient.getClient();
 
  public getClient(): Redis {
    return this.client;
  }
  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl, serialize = true } = options;
    const serializedValue = serialize ? JSON.stringify(value) : value;

    if (ttl) {
      await this.client.setex(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, deserialize = true): Promise<T | null> {
    const value = (await this.client.get(key)) as string | null;
    if (value === null) return null;

    return deserialize ? (JSON.parse(value) as unknown as T) : (value as unknown as T);
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Delete multiple keys from cache
   */
  async delMultiple(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(key, ttl);
    return result === 1;
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Increment a numeric value by a specific amount
   */
  async incrBy(key: string, increment: number): Promise<number> {
    return this.client.incrby(key, increment);
  }

  /**
   * Set a value only if the key doesn't exist
   */
  async setNX(key: string, value: any, ttl?: number): Promise<boolean> {
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      const result = await this.client.set(key, serializedValue, 'EX', ttl, 'NX');
      return result === 'OK';
    } else {
      const result = await this.client.setnx(key, serializedValue);
      return result === 1;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[], deserialize = true): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    const values = (await this.client.mget(...keys)) as (string | null)[];
    return values.map(value => {
      if (value === null) return null;
      return deserialize ? (JSON.parse(value) as unknown as T) : (value as unknown as T);
    });
  }

  /**
   * Set multiple key-value pairs at once
   */
  async mset(keyValuePairs: Record<string, any>, serialize = true): Promise<void> {
    const pairs: string[] = [];
    
    for (const [key, value] of Object.entries(keyValuePairs)) {
      pairs.push(key, serialize ? JSON.stringify(value) : value);
    }
    
    if (pairs.length > 0) {
      await this.client.mset(...pairs);
    }
  }

  /**
   * Add item to a list (left push)
   */
  async lpush(key: string, ...values: any[]): Promise<number> {
    const serializedValues = values.map(v => JSON.stringify(v));
    return this.client.lpush(key, ...serializedValues);
  }

  /**
   * Remove and return item from list (right pop)
   */
  async rpop<T>(key: string): Promise<T | null> {
    const value = (await this.client.rpop(key)) as string | null;
    return value ? (JSON.parse(value) as unknown as T) : null;
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  /**
   * Get list range
   */
  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = (await this.client.lrange(key, start, stop)) as string[];
    return values.map(v => JSON.parse(v) as unknown as T);
  }

  /**
   * Add member to a set
   */
  async sadd(key: string, ...members: any[]): Promise<number> {
    const serializedMembers = members.map(m => JSON.stringify(m));
    return this.client.sadd(key, ...serializedMembers);
  }

  /**
   * Get all members of a set
   */
  async smembers<T>(key: string): Promise<T[]> {
    const members = (await this.client.smembers(key)) as string[];
    return members.map(m => JSON.parse(m) as unknown as T);
  }

  /**
   * Remove member from set
   */
  async srem(key: string, ...members: any[]): Promise<number> {
    const serializedMembers = members.map(m => JSON.stringify(m));
    return this.client.srem(key, ...serializedMembers);
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: any): Promise<boolean> {
    const result = await this.client.sismember(key, JSON.stringify(member));
    return result === 1;
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    return this.client.hset(key, field, JSON.stringify(value));
  }

  /**
   * Get hash field
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = (await this.client.hget(key, field)) as string | null;
    return value ? (JSON.parse(value) as unknown as T) : null;
  }

  /**
   * Get all hash fields and values
   */
  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const hash = (await this.client.hgetall(key)) as Record<string, string>;
    const result: Record<string, T> = {};

    for (const [field, value] of Object.entries(hash)) {
      result[field] = JSON.parse(value) as unknown as T;
    }

    return result;
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<number> {
    const publisher = redisClient.getPublisher();
    return publisher.publish(channel, JSON.stringify(message));
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = redisClient.getSubscriber();
    
    subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing subscription message:', error);
        }
      }
    });
  }

  /**
   * Pattern-based key deletion
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    const info = await this.client.info('memory');
    const keyspace = await this.client.info('keyspace');
    
    return {
      memory: info,
      keyspace: keyspace,
      connected: await redisClient.healthCheck(),
    };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();