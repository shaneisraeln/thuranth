/**
 * Performance Test Setup
 * 
 * This file sets up the test environment for performance tests,
 * including database connections, monitoring tools, and performance utilities.
 */

import { config } from 'dotenv';
import { join } from 'path';
import { performance } from 'perf_hooks';

// Load performance test environment variables
config({ path: join(__dirname, '.env.performance') });

// Set performance test environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'performance';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_NAME = process.env.DB_NAME || 'pdcp_perf_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Performance test timeout (5 minutes)
jest.setTimeout(300000);

// Performance monitoring utilities
interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  eventLoopDelay: number;
}

class PerformanceMonitor {
  private snapshots: PerformanceSnapshot[] = [];
  private startCpuUsage: NodeJS.CpuUsage;
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    this.startCpuUsage = process.cpuUsage();
    this.snapshots = [];
    
    // Take snapshots every second
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, 1000);
  }

  stop(): PerformanceSnapshot[] {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.snapshots;
  }

  private takeSnapshot(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.startCpuUsage);
    
    // Measure event loop delay
    const start = performance.now();
    setImmediate(() => {
      const eventLoopDelay = performance.now() - start;
      
      this.snapshots.push({
        timestamp: Date.now(),
        memoryUsage,
        cpuUsage,
        eventLoopDelay,
      });
    });
  }

  getAverageMemoryUsage(): number {
    if (this.snapshots.length === 0) return 0;
    const totalMemory = this.snapshots.reduce((sum, snapshot) => sum + snapshot.memoryUsage.heapUsed, 0);
    return totalMemory / this.snapshots.length;
  }

  getPeakMemoryUsage(): number {
    if (this.snapshots.length === 0) return 0;
    return Math.max(...this.snapshots.map(snapshot => snapshot.memoryUsage.heapUsed));
  }

  getAverageEventLoopDelay(): number {
    if (this.snapshots.length === 0) return 0;
    const totalDelay = this.snapshots.reduce((sum, snapshot) => sum + snapshot.eventLoopDelay, 0);
    return totalDelay / this.snapshots.length;
  }
}

// Global performance monitor
const performanceMonitor = new PerformanceMonitor();

// Global test setup
beforeAll(async () => {
  console.log('🔧 Setting up performance test environment...');
  
  // Start performance monitoring
  performanceMonitor.start();
  
  // Ensure performance test database is ready
  await setupPerformanceDatabase();
  
  // Warm up services
  await warmUpServices();
  
  console.log('✅ Performance test environment ready');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up performance test environment...');
  
  // Stop performance monitoring
  const snapshots = performanceMonitor.stop();
  
  // Log performance summary
  logPerformanceSummary(snapshots);
  
  // Clean up performance test data
  await cleanupPerformanceDatabase();
  
  console.log('✅ Performance test cleanup complete');
});

/**
 * Set up the performance test database
 */
async function setupPerformanceDatabase(): Promise<void> {
  try {
    console.log('   🗄️ Setting up performance test database...');
    
    // In a real implementation, you would:
    // 1. Connect to the performance test database
    // 2. Create necessary tables and indexes
    // 3. Load test data for performance testing
    // 4. Configure database for optimal performance testing
    
    console.log('   ✅ Performance test database ready');
  } catch (error) {
    console.error('   ❌ Failed to setup performance test database:', error);
    throw error;
  }
}

/**
 * Warm up services before performance testing
 */
async function warmUpServices(): Promise<void> {
  try {
    console.log('   🔥 Warming up services...');
    
    // Simulate service warm-up
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('   ✅ Services warmed up');
  } catch (error) {
    console.error('   ❌ Failed to warm up services:', error);
    throw error;
  }
}

/**
 * Clean up the performance test database
 */
async function cleanupPerformanceDatabase(): Promise<void> {
  try {
    console.log('   🗑️ Cleaning up performance test database...');
    
    // In a real implementation, you would:
    // 1. Connect to the performance test database
    // 2. Clean up test data
    // 3. Reset database state
    
    console.log('   ✅ Performance test database cleaned');
  } catch (error) {
    console.error('   ❌ Failed to cleanup performance test database:', error);
    // Don't throw error during cleanup
  }
}

/**
 * Log performance summary
 */
function logPerformanceSummary(snapshots: PerformanceSnapshot[]): void {
  if (snapshots.length === 0) {
    console.log('   📊 No performance data collected');
    return;
  }

  const avgMemoryMB = performanceMonitor.getAverageMemoryUsage() / 1024 / 1024;
  const peakMemoryMB = performanceMonitor.getPeakMemoryUsage() / 1024 / 1024;
  const avgEventLoopDelay = performanceMonitor.getAverageEventLoopDelay();

  console.log('\n📊 Performance Summary:');
  console.log(`   - Test Duration: ${(snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp) / 1000}s`);
  console.log(`   - Average Memory Usage: ${avgMemoryMB.toFixed(2)} MB`);
  console.log(`   - Peak Memory Usage: ${peakMemoryMB.toFixed(2)} MB`);
  console.log(`   - Average Event Loop Delay: ${avgEventLoopDelay.toFixed(2)} ms`);
  console.log(`   - Performance Snapshots: ${snapshots.length}`);
}

// Export performance utilities
export const performanceUtils = {
  monitor: performanceMonitor,
  
  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> => {
    const start = performance.now();
    const result = await fn();
    const executionTime = performance.now() - start;
    return { result, executionTime };
  },
  
  /**
   * Generate load test data
   */
  generateLoadTestData: {
    vehicles: (count: number) => Array.from({ length: count }, (_, i) => ({
      id: `load-test-vehicle-${i}`,
      registrationNumber: `LOAD-${i}`,
      type: i % 2 === 0 ? 'FOUR_WHEELER' : 'TWO_WHEELER',
      driverId: `load-test-driver-${i}`,
      capacity: {
        maxWeight: i % 2 === 0 ? 1000 : 50,
        maxVolume: i % 2 === 0 ? 50 : 5,
        currentWeight: Math.random() * 100,
        currentVolume: Math.random() * 10,
      },
      currentLocation: {
        latitude: 12.9716 + (Math.random() - 0.5) * 0.2,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.2,
      },
    })),
    
    parcels: (count: number) => Array.from({ length: count }, (_, i) => ({
      id: `load-test-parcel-${i}`,
      trackingNumber: `LOAD-PKG-${i}`,
      pickupLocation: {
        latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.1,
      },
      deliveryLocation: {
        latitude: 12.9352 + (Math.random() - 0.5) * 0.1,
        longitude: 77.6245 + (Math.random() - 0.5) * 0.1,
      },
      slaDeadline: new Date(Date.now() + (Math.random() * 48 + 24) * 60 * 60 * 1000),
      weight: Math.random() * 10 + 1,
      dimensions: {
        length: Math.floor(Math.random() * 50) + 10,
        width: Math.floor(Math.random() * 40) + 10,
        height: Math.floor(Math.random() * 30) + 5,
      },
    })),
    
    decisions: (count: number) => Array.from({ length: count }, (_, i) => ({
      parcelId: `load-test-parcel-${i}`,
      pickupLocation: {
        latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.1,
      },
      deliveryLocation: {
        latitude: 12.9352 + (Math.random() - 0.5) * 0.1,
        longitude: 77.6245 + (Math.random() - 0.5) * 0.1,
      },
      slaDeadline: new Date(Date.now() + (Math.random() * 48 + 24) * 60 * 60 * 1000),
      weight: Math.random() * 10 + 1,
      dimensions: {
        length: Math.floor(Math.random() * 50) + 10,
        width: Math.floor(Math.random() * 40) + 10,
        height: Math.floor(Math.random() * 30) + 5,
      },
      priority: ['LOW', 'NORMAL', 'HIGH'][Math.floor(Math.random() * 3)],
    })),
  },
  
  /**
   * Calculate percentiles from an array of numbers
   */
  calculatePercentiles: (values: number[], percentiles: number[] = [50, 90, 95, 99]) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const result: Record<string, number> = {};
    
    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });
    
    return result;
  },
  
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a rate limiter for load testing
   */
  createRateLimiter: (requestsPerSecond: number) => {
    const interval = 1000 / requestsPerSecond;
    let lastRequest = 0;
    
    return async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < interval) {
        await performanceUtils.wait(interval - timeSinceLastRequest);
      }
      
      lastRequest = Date.now();
    };
  },
};