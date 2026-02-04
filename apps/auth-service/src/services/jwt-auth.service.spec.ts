import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthService } from './jwt-auth.service';
import { SecurityLoggerService } from './security-logger.service';
import { User } from '../entities/user.entity';
import { UserRole, Permission } from '../interfaces/auth.interfaces';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let userRepository: Repository<User>;
  let securityLogger: SecurityLoggerService;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.DISPATCHER,
    permissions: [Permission.VIEW_VEHICLES, Permission.MANAGE_PARCELS],
    isActive: true,
    lastLogin: undefined,
    firebaseUid: undefined,
    phoneNumber: undefined,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    fullName: 'Test User',
    isLocked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'JWT_SECRET':
                  return 'test-secret';
                case 'JWT_REFRESH_SECRET':
                  return 'test-refresh-secret';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: SecurityLoggerService,
          useValue: {
            logSecurityEvent: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    securityLogger = module.get<SecurityLoggerService>(SecurityLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(service as any, 'resetFailedAttempts').mockResolvedValue(undefined);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const result = await service.login(
        { email: 'test@example.com', password: 'password' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_success',
          email: 'test@example.com',
        })
      );
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'invalid@example.com', password: 'password' },
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          email: 'invalid@example.com',
        })
      );
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const lockedUser = { ...mockUser, lockedUntil: new Date(Date.now() + 1000000), fullName: 'Test User', isLocked: true };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(lockedUser);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'password' },
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          details: expect.objectContaining({ reason: 'account_locked' }),
        })
      );
    });

    it('should throw UnauthorizedException for inactive account', async () => {
      const inactiveUser = { ...mockUser, isActive: false, fullName: 'Test User', isLocked: false };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'password' },
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          details: expect.objectContaining({ reason: 'account_inactive' }),
        })
      );
    });
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const payload = {
        sub: '123',
        email: 'test@example.com',
        role: UserRole.DISPATCHER,
        permissions: [Permission.VIEW_VEHICLES],
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      const result = await service.validateUser(payload);

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false, fullName: 'Test User', isLocked: false };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      const payload = {
        sub: '123',
        email: 'test@example.com',
        role: UserRole.DISPATCHER,
        permissions: [Permission.VIEW_VEHICLES],
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });
  });
});