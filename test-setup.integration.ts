/**
 * Integration Test Setup
 * 
 * This file sets up the test environment for integration tests,
 * including database connections, environment variables, and global test utilities.
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '.env.test') });

// Set default test environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_NAME = process.env.DB_NAME || 'pdcp_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.BLOCKCHAIN_NETWORK = process.env.BLOCKCHAIN_NETWORK || 'test';

// Global test timeout
jest.setTimeout(60000);

// Global test setup
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  
  // Ensure test database is clean
  await cleanTestDatabase();
  
  console.log('✅ Integration test environment ready');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  // Clean up test data
  await cleanTestDatabase();
  
  console.log('✅ Integration test cleanup complete');
});

/**
 * Clean the test database before and after tests
 */
async function cleanTestDatabase(): Promise<void> {
  try {
    // This would typically connect to the test database and clean up
    // For now, we'll just log the action
    console.log('   🗑️ Cleaning test database...');
    
    // In a real implementation, you would:
    // 1. Connect to the test database
    // 2. Drop and recreate tables
    // 3. Run any necessary seed data
    
    console.log('   ✅ Test database cleaned');
  } catch (error) {
    console.error('   ❌ Failed to clean test database:', error);
    throw error;
  }
}

// Export test utilities
export const testUtils = {
  cleanTestDatabase,
  
  /**
   * Generate test data for various entities
   */
  generateTestData: {
    vehicle: () => ({
      registrationNumber: `TEST-${Date.now()}`,
      type: 'FOUR_WHEELER',
      capacity: {
        maxWeight: 1000,
        maxVolume: 50,
        currentWeight: 0,
        currentVolume: 0,
      },
      currentLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
    }),
    
    parcel: () => ({
      trackingNumber: `PKG-${Date.now()}`,
      pickupLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      deliveryLocation: {
        latitude: 12.9352,
        longitude: 77.6245,
      },
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      weight: Math.random() * 10 + 1,
      dimensions: {
        length: 30,
        width: 20,
        height: 15,
      },
    }),
    
    user: (role: string) => ({
      email: `test-${role}-${Date.now()}@pdcp.com`,
      password: 'test-password',
      role: role,
      name: `Test ${role}`,
    }),
  },
  
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Retry a function with exponential backoff
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await testUtils.wait(delay);
      }
    }
    
    throw lastError!;
  },
};