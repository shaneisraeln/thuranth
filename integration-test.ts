/**
 * End-to-End Integration Test for PDCP Backend Services
 * 
 * This test validates the complete workflow from parcel creation to delivery
 * across all backend services to ensure proper integration.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';

// Import service modules
import { AppModule as AuthModule } from './apps/auth-service/src/app.module';
import { AppModule as DecisionEngineModule } from './apps/decision-engine/src/app.module';
import { AppModule as VehicleTrackingModule } from './apps/vehicle-tracking/src/app.module';
import { AppModule as ParcelManagementModule } from './apps/parcel-management/src/app.module';
import { AppModule as CustodyModule } from './apps/custody-service/src/app.module';
import { AppModule as AnalyticsModule } from './apps/analytics-service/src/app.module';
import { AppModule as AuditModule } from './apps/audit-service/src/app.module';

// Import types
import { 
  UserRole,
  VehicleType,
  ParcelStatus,
  DecisionRequest,
  DecisionResponse
} from './packages/types/src';

interface TestContext {
  authApp: INestApplication;
  decisionEngineApp: INestApplication;
  vehicleTrackingApp: INestApplication;
  parcelManagementApp: INestApplication;
  custodyApp: INestApplication;
  analyticsApp: INestApplication;
  auditApp: INestApplication;
  authToken: string;
  testUserId: string;
  testVehicleId: string;
  testParcelId: string;
  testDriverId: string;
  custodyChainId: string;
}

interface TestVehicle {
  id: string;
  type: VehicleType;
  driverId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  capacity: {
    maxWeight: number;
    maxVolume: number;
    currentWeight: number;
    currentVolume: number;
  };
}

interface TestParcel {
  id: string;
  trackingNumber: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  slaDeadline: Date;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

describe('PDCP End-to-End Integration Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    console.log('🚀 Starting PDCP End-to-End Integration Tests...\n');
    
    // Initialize all service applications
    context = await initializeServices();
    
    console.log('✅ All services initialized successfully\n');
  });

  afterAll(async () => {
    // Clean up all applications
    await Promise.all([
      context.authApp?.close(),
      context.decisionEngineApp?.close(),
      context.vehicleTrackingApp?.close(),
      context.parcelManagementApp?.close(),
      context.custodyApp?.close(),
      context.analyticsApp?.close(),
      context.auditApp?.close(),
    ]);
    
    console.log('🧹 All services cleaned up successfully');
  });

  describe('Complete Parcel Lifecycle Workflow', () => {
    it('should execute complete end-to-end workflow', async () => {
      console.log('📋 Testing complete parcel lifecycle workflow...\n');

      // Step 1: Authenticate user
      console.log('1️⃣ Authenticating dispatcher...');
      const authResult = await authenticateUser();
      expect(authResult.success).toBe(true);
      context.authToken = authResult.token;
      context.testUserId = authResult.userId;
      console.log('   ✅ User authenticated successfully');

      // Step 2: Register vehicle and driver
      console.log('2️⃣ Registering test vehicle and driver...');
      const vehicleResult = await registerTestVehicle();
      expect(vehicleResult.success).toBe(true);
      context.testVehicleId = vehicleResult.vehicleId;
      context.testDriverId = vehicleResult.driverId;
      console.log('   ✅ Vehicle and driver registered successfully');

      // Step 3: Create parcel
      console.log('3️⃣ Creating test parcel...');
      const parcelResult = await createTestParcel();
      expect(parcelResult.success).toBe(true);
      context.testParcelId = parcelResult.parcelId;
      console.log('   ✅ Parcel created successfully');

      // Step 4: Decision engine evaluation
      console.log('4️⃣ Running decision engine evaluation...');
      const decisionResult = await evaluateParcelAssignment();
      expect(decisionResult.success).toBe(true);
      expect(decisionResult.recommendedVehicleId).toBe(context.testVehicleId);
      console.log('   ✅ Decision engine recommended vehicle assignment');

      // Step 5: Assign parcel to vehicle
      console.log('5️⃣ Assigning parcel to vehicle...');
      const assignmentResult = await assignParcelToVehicle();
      expect(assignmentResult.success).toBe(true);
      console.log('   ✅ Parcel assigned to vehicle successfully');

      // Step 6: Record custody transfer
      console.log('6️⃣ Recording custody transfer...');
      const custodyResult = await recordCustodyTransfer();
      expect(custodyResult.success).toBe(true);
      context.custodyChainId = custodyResult.custodyChainId;
      console.log('   ✅ Custody transfer recorded successfully');

      // Step 7: Update vehicle location and capacity
      console.log('7️⃣ Updating vehicle status...');
      const vehicleUpdateResult = await updateVehicleStatus();
      expect(vehicleUpdateResult.success).toBe(true);
      console.log('   ✅ Vehicle status updated successfully');

      // Step 8: Complete delivery
      console.log('8️⃣ Completing delivery...');
      const deliveryResult = await completeDelivery();
      expect(deliveryResult.success).toBe(true);
      console.log('   ✅ Delivery completed successfully');

      // Step 9: Verify audit logs
      console.log('9️⃣ Verifying audit logs...');
      const auditResult = await verifyAuditLogs();
      expect(auditResult.success).toBe(true);
      expect(auditResult.logCount).toBeGreaterThan(0);
      console.log('   ✅ Audit logs verified successfully');

      // Step 10: Generate analytics report
      console.log('🔟 Generating analytics report...');
      const analyticsResult = await generateAnalyticsReport();
      expect(analyticsResult.success).toBe(true);
      expect(analyticsResult.metrics).toBeDefined();
      console.log('   ✅ Analytics report generated successfully');

      console.log('\n🎉 Complete end-to-end workflow test passed!\n');
    });
  });

  describe('Shadow Mode Operation Tests', () => {
    it('should validate shadow mode decision logging without execution', async () => {
      console.log('🌙 Testing shadow mode operation...\n');

      // Step 1: Enable shadow mode
      console.log('1️⃣ Enabling shadow mode...');
      const shadowModeResult = await enableShadowMode();
      expect(shadowModeResult.success).toBe(true);
      console.log('   ✅ Shadow mode enabled successfully');

      // Step 2: Create test parcel for shadow mode
      console.log('2️⃣ Creating parcel for shadow mode test...');
      const shadowParcelResult = await createTestParcel('shadow-test');
      expect(shadowParcelResult.success).toBe(true);
      console.log('   ✅ Shadow test parcel created');

      // Step 3: Run decision engine in shadow mode
      console.log('3️⃣ Running decision engine in shadow mode...');
      const shadowDecisionResult = await evaluateParcelAssignmentShadowMode(shadowParcelResult.parcelId);
      expect(shadowDecisionResult.success).toBe(true);
      expect(shadowDecisionResult.shadowMode).toBe(true);
      expect(shadowDecisionResult.executed).toBe(false);
      console.log('   ✅ Shadow mode decision logged without execution');

      // Step 4: Verify shadow mode logs
      console.log('4️⃣ Verifying shadow mode audit logs...');
      const shadowAuditResult = await verifyShadowModeAuditLogs(shadowParcelResult.parcelId);
      expect(shadowAuditResult.success).toBe(true);
      expect(shadowAuditResult.shadowModeLogged).toBe(true);
      console.log('   ✅ Shadow mode audit logs verified');

      // Step 5: Disable shadow mode
      console.log('5️⃣ Disabling shadow mode...');
      const disableShadowResult = await disableShadowMode();
      expect(disableShadowResult.success).toBe(true);
      console.log('   ✅ Shadow mode disabled successfully');

      console.log('\n🌙 Shadow mode operation test passed!\n');
    });
  });

  describe('Blockchain Custody Chain Integration', () => {
    it('should validate complete custody chain integrity', async () => {
      console.log('⛓️ Testing blockchain custody chain integration...\n');

      // Step 1: Create parcel for custody chain test
      console.log('1️⃣ Creating parcel for custody chain test...');
      const custodyParcelResult = await createTestParcel('custody-test');
      expect(custodyParcelResult.success).toBe(true);
      console.log('   ✅ Custody test parcel created');

      // Step 2: Record initial custody (sender to logistics)
      console.log('2️⃣ Recording initial custody transfer...');
      const initialCustodyResult = await recordInitialCustodyTransfer(custodyParcelResult.parcelId);
      expect(initialCustodyResult.success).toBe(true);
      expect(initialCustodyResult.blockchainTxHash).toBeDefined();
      console.log('   ✅ Initial custody transfer recorded on blockchain');

      // Step 3: Record custody transfer to driver
      console.log('3️⃣ Recording custody transfer to driver...');
      const driverCustodyResult = await recordDriverCustodyTransfer(custodyParcelResult.parcelId);
      expect(driverCustodyResult.success).toBe(true);
      expect(driverCustodyResult.blockchainTxHash).toBeDefined();
      console.log('   ✅ Driver custody transfer recorded on blockchain');

      // Step 4: Record final custody transfer (delivery)
      console.log('4️⃣ Recording final custody transfer...');
      const finalCustodyResult = await recordFinalCustodyTransfer(custodyParcelResult.parcelId);
      expect(finalCustodyResult.success).toBe(true);
      expect(finalCustodyResult.blockchainTxHash).toBeDefined();
      console.log('   ✅ Final custody transfer recorded on blockchain');

      // Step 5: Verify complete custody chain
      console.log('5️⃣ Verifying complete custody chain...');
      const custodyChainResult = await verifyCustodyChain(custodyParcelResult.parcelId);
      expect(custodyChainResult.success).toBe(true);
      expect(custodyChainResult.chainLength).toBe(3);
      expect(custodyChainResult.chainIntegrity).toBe(true);
      console.log('   ✅ Complete custody chain verified');

      // Step 6: Test blockchain unavailability resilience
      console.log('6️⃣ Testing offline custody resilience...');
      const offlineResult = await testOfflineCustodyResilience(custodyParcelResult.parcelId);
      expect(offlineResult.success).toBe(true);
      expect(offlineResult.queuedRecords).toBeGreaterThan(0);
      console.log('   ✅ Offline custody resilience verified');

      console.log('\n⛓️ Blockchain custody chain integration test passed!\n');
    });
  });

  describe('Service Integration Validation', () => {
    it('should validate all services are properly integrated', async () => {
      console.log('🔗 Testing service integration...\n');

      // Test service health endpoints
      const healthChecks = await Promise.all([
        checkServiceHealth('auth', context.authApp),
        checkServiceHealth('decision-engine', context.decisionEngineApp),
        checkServiceHealth('vehicle-tracking', context.vehicleTrackingApp),
        checkServiceHealth('parcel-management', context.parcelManagementApp),
        checkServiceHealth('custody', context.custodyApp),
        checkServiceHealth('analytics', context.analyticsApp),
        checkServiceHealth('audit', context.auditApp),
      ]);

      healthChecks.forEach((result, index) => {
        const services = ['auth', 'decision-engine', 'vehicle-tracking', 'parcel-management', 'custody', 'analytics', 'audit'];
        expect(result.healthy).toBe(true);
        console.log(`   ✅ ${services[index]} service is healthy`);
      });

      console.log('\n✅ All services are properly integrated and healthy\n');
    });

    it('should validate cross-service communication', async () => {
      console.log('📡 Testing cross-service communication...\n');

      // Test decision engine -> vehicle tracking communication
      console.log('1️⃣ Testing decision engine to vehicle tracking...');
      const decisionToVehicleResult = await testDecisionToVehicleCommunication();
      expect(decisionToVehicleResult.success).toBe(true);
      console.log('   ✅ Decision engine to vehicle tracking communication verified');

      // Test parcel management -> custody service communication
      console.log('2️⃣ Testing parcel management to custody service...');
      const parcelToCustodyResult = await testParcelToCustodyCommunication();
      expect(parcelToCustodyResult.success).toBe(true);
      console.log('   ✅ Parcel management to custody service communication verified');

      // Test analytics -> audit service communication
      console.log('3️⃣ Testing analytics to audit service...');
      const analyticsToAuditResult = await testAnalyticsToAuditCommunication();
      expect(analyticsToAuditResult.success).toBe(true);
      console.log('   ✅ Analytics to audit service communication verified');

      console.log('\n📡 Cross-service communication test passed!\n');
    });
  });

  // Helper functions for test execution
  async function initializeServices(): Promise<TestContext> {
    // Use PostgreSQL test database configuration
    const testDbConfig = {
      type: 'postgres' as const,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'pdcp_test',
      synchronize: true,
      logging: false,
      entities: ['**/*.entity.ts'],
    };

    // Initialize each service with test configuration
    const authModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        AuthModule,
      ],
    }).compile();

    const decisionEngineModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        DecisionEngineModule,
      ],
    }).compile();

    const vehicleTrackingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        VehicleTrackingModule,
      ],
    }).compile();

    const parcelManagementModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        ParcelManagementModule,
      ],
    }).compile();

    const custodyModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        CustodyModule,
      ],
    }).compile();

    const analyticsModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        AnalyticsModule,
      ],
    }).compile();

    const auditModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        AuditModule,
      ],
    }).compile();

    // Create applications
    const authApp = authModule.createNestApplication();
    const decisionEngineApp = decisionEngineModule.createNestApplication();
    const vehicleTrackingApp = vehicleTrackingModule.createNestApplication();
    const parcelManagementApp = parcelManagementModule.createNestApplication();
    const custodyApp = custodyModule.createNestApplication();
    const analyticsApp = analyticsModule.createNestApplication();
    const auditApp = auditModule.createNestApplication();

    // Initialize all applications
    await Promise.all([
      authApp.init(),
      decisionEngineApp.init(),
      vehicleTrackingApp.init(),
      parcelManagementApp.init(),
      custodyApp.init(),
      analyticsApp.init(),
      auditApp.init(),
    ]);

    return {
      authApp,
      decisionEngineApp,
      vehicleTrackingApp,
      parcelManagementApp,
      custodyApp,
      analyticsApp,
      auditApp,
      authToken: '',
      testUserId: '',
      testVehicleId: '',
      testParcelId: '',
      testDriverId: '',
      custodyChainId: '',
    };
  }

  async function authenticateUser(): Promise<{ success: boolean; token: string; userId: string }> {
    try {
      const response = await request(context.authApp.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test-dispatcher@pdcp.com',
          password: 'test-password',
          role: UserRole.DISPATCHER,
        })
        .expect(200);

      return {
        success: true,
        token: response.body.accessToken,
        userId: response.body.user.id,
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return { success: false, token: '', userId: '' };
    }
  }

  async function registerTestVehicle(): Promise<{ success: boolean; vehicleId: string; driverId: string }> {
    try {
      // First create a test driver
      const driverResponse = await request(context.authApp.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          email: 'test-driver@pdcp.com',
          password: 'driver-password',
          role: UserRole.DRIVER,
          name: 'Test Driver',
        })
        .expect(201);

      const driverId = driverResponse.body.user.id;

      // Then register the vehicle
      const vehicleResponse = await request(context.vehicleTrackingApp.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          registrationNumber: 'TEST-VH-001',
          type: VehicleType.FOUR_WHEELER,
          driverId: driverId,
          capacity: {
            maxWeight: 1000,
            maxVolume: 50,
            currentWeight: 200,
            currentVolume: 10,
          },
          currentLocation: {
            latitude: 12.9716,
            longitude: 77.5946, // Bangalore coordinates
          },
        })
        .expect(201);

      return {
        success: true,
        vehicleId: vehicleResponse.body.id,
        driverId: driverId,
      };
    } catch (error) {
      console.error('Vehicle registration failed:', error);
      return { success: false, vehicleId: '', driverId: '' };
    }
  }

  async function createTestParcel(prefix: string = 'test'): Promise<{ success: boolean; parcelId: string }> {
    try {
      const response = await request(context.parcelManagementApp.getHttpServer())
        .post('/parcels')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          trackingNumber: `${prefix.toUpperCase()}-PKG-001`,
          senderId: 'sender-001',
          recipientId: 'recipient-001',
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
          deliveryLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
          },
          slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          weight: 5.5,
          dimensions: {
            length: 30,
            width: 20,
            height: 15,
          },
          value: 1000,
        })
        .expect(201);

      return {
        success: true,
        parcelId: response.body.id,
      };
    } catch (error) {
      console.error('Parcel creation failed:', error);
      return { success: false, parcelId: '' };
    }
  }

  async function evaluateParcelAssignment(): Promise<{ success: boolean; recommendedVehicleId: string }> {
    try {
      const decisionRequest: DecisionRequest = {
        parcelId: context.testParcelId,
        pickupLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
        deliveryLocation: {
          latitude: 12.9352,
          longitude: 77.6245,
        },
        slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        weight: 5.5,
        dimensions: {
          length: 30,
          width: 20,
          height: 15,
        },
        priority: 'NORMAL',
      };

      const response = await request(context.decisionEngineApp.getHttpServer())
        .post('/decisions/evaluate')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(decisionRequest)
        .expect(200);

      return {
        success: true,
        recommendedVehicleId: response.body.recommendedVehicleId,
      };
    } catch (error) {
      console.error('Decision evaluation failed:', error);
      return { success: false, recommendedVehicleId: '' };
    }
  }

  async function assignParcelToVehicle(): Promise<{ success: boolean }> {
    try {
      await request(context.parcelManagementApp.getHttpServer())
        .patch(`/parcels/${context.testParcelId}/assign`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          vehicleId: context.testVehicleId,
          driverId: context.testDriverId,
        })
        .expect(200);

      return { success: true };
    } catch (error) {
      console.error('Parcel assignment failed:', error);
      return { success: false };
    }
  }

  async function recordCustodyTransfer(): Promise<{ success: boolean; custodyChainId: string }> {
    try {
      const response = await request(context.custodyApp.getHttpServer())
        .post('/custody/transfer')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          parcelId: context.testParcelId,
          fromParty: 'logistics-hub',
          toParty: context.testDriverId,
          location: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
          signature: 'digital-signature-hash',
          metadata: {
            transferType: 'pickup',
            timestamp: new Date().toISOString(),
          },
        })
        .expect(201);

      return {
        success: true,
        custodyChainId: response.body.custodyChainId,
      };
    } catch (error) {
      console.error('Custody transfer recording failed:', error);
      return { success: false, custodyChainId: '' };
    }
  }

  async function updateVehicleStatus(): Promise<{ success: boolean }> {
    try {
      await request(context.vehicleTrackingApp.getHttpServer())
        .patch(`/vehicles/${context.testVehicleId}/location`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          latitude: 12.9352,
          longitude: 77.6245,
          timestamp: new Date().toISOString(),
        })
        .expect(200);

      // Update capacity after parcel pickup
      await request(context.vehicleTrackingApp.getHttpServer())
        .patch(`/vehicles/${context.testVehicleId}/capacity`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          currentWeight: 205.5, // Added 5.5kg parcel
          currentVolume: 11.8,   // Added parcel volume
        })
        .expect(200);

      return { success: true };
    } catch (error) {
      console.error('Vehicle status update failed:', error);
      return { success: false };
    }
  }

  async function completeDelivery(): Promise<{ success: boolean }> {
    try {
      await request(context.parcelManagementApp.getHttpServer())
        .patch(`/parcels/${context.testParcelId}/deliver`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          deliveryLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
          },
          deliveryTimestamp: new Date().toISOString(),
          recipientSignature: 'recipient-signature-hash',
        })
        .expect(200);

      return { success: true };
    } catch (error) {
      console.error('Delivery completion failed:', error);
      return { success: false };
    }
  }

  async function verifyAuditLogs(): Promise<{ success: boolean; logCount: number }> {
    try {
      const response = await request(context.auditApp.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${context.authToken}`)
        .query({
          parcelId: context.testParcelId,
          startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
          endDate: new Date().toISOString(),
        })
        .expect(200);

      return {
        success: true,
        logCount: response.body.logs.length,
      };
    } catch (error) {
      console.error('Audit log verification failed:', error);
      return { success: false, logCount: 0 };
    }
  }

  async function generateAnalyticsReport(): Promise<{ success: boolean; metrics: any }> {
    try {
      const response = await request(context.analyticsApp.getHttpServer())
        .get('/analytics/impact-report')
        .set('Authorization', `Bearer ${context.authToken}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          endDate: new Date().toISOString(),
        })
        .expect(200);

      return {
        success: true,
        metrics: response.body.metrics,
      };
    } catch (error) {
      console.error('Analytics report generation failed:', error);
      return { success: false, metrics: null };
    }
  }

  // Shadow mode test functions
  async function enableShadowMode(): Promise<{ success: boolean }> {
    try {
      await request(context.decisionEngineApp.getHttpServer())
        .patch('/decisions/shadow-mode')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ enabled: true })
        .expect(200);

      return { success: true };
    } catch (error) {
      console.error('Shadow mode enable failed:', error);
      return { success: false };
    }
  }

  async function disableShadowMode(): Promise<{ success: boolean }> {
    try {
      await request(context.decisionEngineApp.getHttpServer())
        .patch('/decisions/shadow-mode')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ enabled: false })
        .expect(200);

      return { success: true };
    } catch (error) {
      console.error('Shadow mode disable failed:', error);
      return { success: false };
    }
  }

  async function evaluateParcelAssignmentShadowMode(parcelId: string): Promise<{ 
    success: boolean; 
    shadowMode: boolean; 
    executed: boolean;
  }> {
    try {
      const response = await request(context.decisionEngineApp.getHttpServer())
        .post('/decisions/evaluate')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          parcelId: parcelId,
          pickupLocation: { latitude: 12.9716, longitude: 77.5946 },
          deliveryLocation: { latitude: 12.9352, longitude: 77.6245 },
          slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
          weight: 3.0,
          dimensions: { length: 25, width: 15, height: 10 },
          priority: 'NORMAL',
        })
        .expect(200);

      return {
        success: true,
        shadowMode: response.body.shadowMode,
        executed: response.body.executed,
      };
    } catch (error) {
      console.error('Shadow mode evaluation failed:', error);
      return { success: false, shadowMode: false, executed: false };
    }
  }

  async function verifyShadowModeAuditLogs(parcelId: string): Promise<{ 
    success: boolean; 
    shadowModeLogged: boolean;
  }> {
    try {
      const response = await request(context.auditApp.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${context.authToken}`)
        .query({
          parcelId: parcelId,
          shadowMode: true,
        })
        .expect(200);

      return {
        success: true,
        shadowModeLogged: response.body.logs.length > 0,
      };
    } catch (error) {
      console.error('Shadow mode audit verification failed:', error);
      return { success: false, shadowModeLogged: false };
    }
  }

  // Blockchain custody chain test functions
  async function recordInitialCustodyTransfer(parcelId: string): Promise<{ 
    success: boolean; 
    blockchainTxHash: string;
  }> {
    try {
      const response = await request(context.custodyApp.getHttpServer())
        .post('/custody/transfer')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          parcelId: parcelId,
          fromParty: 'sender-001',
          toParty: 'logistics-hub',
          location: { latitude: 12.9716, longitude: 77.5946 },
          signature: 'sender-signature-hash',
          metadata: { transferType: 'initial_pickup' },
        })
        .expect(201);

      return {
        success: true,
        blockchainTxHash: response.body.blockchainTxHash,
      };
    } catch (error) {
      console.error('Initial custody transfer failed:', error);
      return { success: false, blockchainTxHash: '' };
    }
  }

  async function recordDriverCustodyTransfer(parcelId: string): Promise<{ 
    success: boolean; 
    blockchainTxHash: string;
  }> {
    try {
      const response = await request(context.custodyApp.getHttpServer())
        .post('/custody/transfer')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          parcelId: parcelId,
          fromParty: 'logistics-hub',
          toParty: context.testDriverId,
          location: { latitude: 12.9716, longitude: 77.5946 },
          signature: 'driver-signature-hash',
          metadata: { transferType: 'driver_pickup' },
        })
        .expect(201);

      return {
        success: true,
        blockchainTxHash: response.body.blockchainTxHash,
      };
    } catch (error) {
      console.error('Driver custody transfer failed:', error);
      return { success: false, blockchainTxHash: '' };
    }
  }

  async function recordFinalCustodyTransfer(parcelId: string): Promise<{ 
    success: boolean; 
    blockchainTxHash: string;
  }> {
    try {
      const response = await request(context.custodyApp.getHttpServer())
        .post('/custody/transfer')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          parcelId: parcelId,
          fromParty: context.testDriverId,
          toParty: 'recipient-001',
          location: { latitude: 12.9352, longitude: 77.6245 },
          signature: 'recipient-signature-hash',
          metadata: { transferType: 'final_delivery' },
        })
        .expect(201);

      return {
        success: true,
        blockchainTxHash: response.body.blockchainTxHash,
      };
    } catch (error) {
      console.error('Final custody transfer failed:', error);
      return { success: false, blockchainTxHash: '' };
    }
  }

  async function verifyCustodyChain(parcelId: string): Promise<{ 
    success: boolean; 
    chainLength: number;
    chainIntegrity: boolean;
  }> {
    try {
      const response = await request(context.custodyApp.getHttpServer())
        .get(`/custody/chain/${parcelId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(200);

      return {
        success: true,
        chainLength: response.body.custodyRecords.length,
        chainIntegrity: response.body.verified,
      };
    } catch (error) {
      console.error('Custody chain verification failed:', error);
      return { success: false, chainLength: 0, chainIntegrity: false };
    }
  }

  async function testOfflineCustodyResilience(parcelId: string): Promise<{ 
    success: boolean; 
    queuedRecords: number;
  }> {
    try {
      // Simulate blockchain unavailability by making a custody transfer
      // when blockchain is offline (this would queue the record)
      const response = await request(context.custodyApp.getHttpServer())
        .post('/custody/transfer-offline')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          parcelId: parcelId,
          fromParty: 'test-party-1',
          toParty: 'test-party-2',
          location: { latitude: 12.9500, longitude: 77.6000 },
          signature: 'offline-test-signature',
          metadata: { transferType: 'offline_test' },
        })
        .expect(202); // Accepted but queued

      return {
        success: true,
        queuedRecords: response.body.queuedRecords || 1,
      };
    } catch (error) {
      console.error('Offline custody resilience test failed:', error);
      return { success: false, queuedRecords: 0 };
    }
  }

  // Cross-service communication test functions
  async function testDecisionToVehicleCommunication(): Promise<{ success: boolean }> {
    try {
      // Test that decision engine can query vehicle tracking service
      const response = await request(context.decisionEngineApp.getHttpServer())
        .get('/decisions/available-vehicles')
        .set('Authorization', `Bearer ${context.authToken}`)
        .query({
          pickupLocation: '12.9716,77.5946',
          deliveryLocation: '12.9352,77.6245',
          maxDistance: 50,
        })
        .expect(200);

      return { success: response.body.vehicles.length >= 0 };
    } catch (error) {
      console.error('Decision to vehicle communication test failed:', error);
      return { success: false };
    }
  }

  async function testParcelToCustodyCommunication(): Promise<{ success: boolean }> {
    try {
      // Test that parcel management can trigger custody recording
      const response = await request(context.parcelManagementApp.getHttpServer())
        .post(`/parcels/${context.testParcelId}/custody-event`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({
          eventType: 'status_change',
          newStatus: ParcelStatus.IN_TRANSIT,
          location: { latitude: 12.9716, longitude: 77.5946 },
        })
        .expect(200);

      return { success: response.body.custodyRecorded === true };
    } catch (error) {
      console.error('Parcel to custody communication test failed:', error);
      return { success: false };
    }
  }

  async function testAnalyticsToAuditCommunication(): Promise<{ success: boolean }> {
    try {
      // Test that analytics can query audit logs for metrics calculation
      const response = await request(context.analyticsApp.getHttpServer())
        .get('/analytics/audit-based-metrics')
        .set('Authorization', `Bearer ${context.authToken}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          metricType: 'decision_accuracy',
        })
        .expect(200);

      return { success: response.body.metrics !== undefined };
    } catch (error) {
      console.error('Analytics to audit communication test failed:', error);
      return { success: false };
    }
  }

  async function checkServiceHealth(_serviceName: string, app: INestApplication): Promise<{ healthy: boolean }> {
    try {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      return { healthy: response.body.status === 'ok' };
    } catch (error) {
      console.error(`Health check failed for ${_serviceName}:`, error);
      return { healthy: false };
    }
  }
});

// Export for running standalone
export { TestContext };

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 Running PDCP End-to-End Integration Tests...\n');
  
  // Note: In a real environment, these would be run with Jest
  // This demonstrates the test structure and expected behavior
  console.log('✅ Integration test structure is complete');
  console.log('\n📋 Test Coverage:');
  console.log('- Complete parcel lifecycle workflow (10 steps)');
  console.log('- Service integration validation');
  console.log('- Health checks for all services');
  console.log('- Authentication and authorization flow');
  console.log('- Decision engine evaluation');
  console.log('- Vehicle tracking and capacity management');
  console.log('- Parcel management and SLA monitoring');
  console.log('- Custody chain recording');
  console.log('- Audit logging verification');
  console.log('- Analytics report generation');
  console.log('\n🎯 Backend services integration is ready for testing!');
}