import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { User } from './entities/user.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { UserRole, Permission } from './interfaces/auth.interfaces';

describe('AuthService Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, SecurityEvent],
          synchronize: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'healthy');
          expect(res.body).toHaveProperty('firebase');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Authentication Flow', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Create a test user directly in the database for testing
      const userRepository = app.get('UserRepository');
      const jwtAuthService = app.get('JwtAuthService');
      
      const hashedPassword = await jwtAuthService.hashPassword('testpassword');
      
      const testUser = userRepository.create({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.DISPATCHER,
        permissions: [Permission.VIEW_VEHICLES, Permission.MANAGE_PARCELS],
        isActive: true,
      });

      await userRepository.save(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
      expect(response.body.role).toBe(UserRole.DISPATCHER);
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Role-based Access Control', () => {
    let adminToken: string;
    let driverToken: string;

    beforeAll(async () => {
      const userRepository = app.get('UserRepository');
      const jwtAuthService = app.get('JwtAuthService');
      
      const hashedPassword = await jwtAuthService.hashPassword('testpassword');
      
      // Create admin user
      const adminUser = userRepository.create({
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        permissions: [Permission.MANAGE_USERS, Permission.VIEW_AUDIT_LOGS],
        isActive: true,
      });

      // Create driver user
      const driverUser = userRepository.create({
        email: 'driver@example.com',
        passwordHash: hashedPassword,
        firstName: 'Driver',
        lastName: 'User',
        role: UserRole.DRIVER,
        permissions: [Permission.VIEW_VEHICLES],
        isActive: true,
      });

      await userRepository.save([adminUser, driverUser]);

      // Login as admin
      const adminResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'testpassword',
        });
      adminToken = adminResponse.body.accessToken;

      // Login as driver
      const driverResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'driver@example.com',
          password: 'testpassword',
        });
      driverToken = driverResponse.body.accessToken;
    });

    it('should allow admin to access user management', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny driver access to user management', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('should allow admin to access security events', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/security/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny driver access to security events', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/security/events')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });
  });
});