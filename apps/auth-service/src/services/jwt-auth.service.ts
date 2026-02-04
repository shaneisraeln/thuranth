import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { JwtPayload, LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, AuthUser } from '../interfaces/auth.interfaces';
import { SecurityLoggerService } from './security-logger.service';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDuration = 30 * 60 * 1000; // 30 minutes

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private securityLogger: SecurityLoggerService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async login(loginRequest: LoginRequest, ipAddress: string, userAgent: string): Promise<LoginResponse> {
    const { email, password } = loginRequest;

    try {
      const user = await this.userRepository.findOne({ where: { email } });
      
      if (!user) {
        await this.securityLogger.logSecurityEvent({
          type: 'login_failure',
          email,
          ipAddress,
          userAgent,
          details: { reason: 'user_not_found' },
          severity: 'medium'
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.isLocked) {
        await this.securityLogger.logSecurityEvent({
          type: 'login_failure',
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          details: { reason: 'account_locked' },
          severity: 'high'
        });
        throw new UnauthorizedException('Account is locked');
      }

      if (!user.isActive) {
        await this.securityLogger.logSecurityEvent({
          type: 'login_failure',
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          details: { reason: 'account_inactive' },
          severity: 'medium'
        });
        throw new UnauthorizedException('Account is inactive');
      }

      const isPasswordValid = await this.validatePassword(password, user.passwordHash);
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user, ipAddress, userAgent);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user);

      const tokens = await this.generateTokens(user);
      
      // Update last login
      user.lastLogin = new Date();
      await this.userRepository.save(user);

      await this.securityLogger.logSecurityEvent({
        type: 'login_success',
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        details: { loginMethod: 'jwt' },
        severity: 'low'
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.mapToAuthUser(user),
        expiresIn: 15 * 60 // 15 minutes in seconds
      };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  async refreshToken(refreshRequest: RefreshTokenRequest, ipAddress: string, userAgent: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshRequest.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')
      });

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      await this.securityLogger.logSecurityEvent({
        type: 'token_refresh',
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: {},
        severity: 'low'
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(payload: JwtPayload): Promise<AuthUser | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      
      if (!user || !user.isActive) {
        return null;
      }

      return this.mapToAuthUser(user);
    } catch (error) {
      this.logger.error('User validation failed', error);
      return null;
    }
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTokenExpiry
      }
    );

    return { accessToken, refreshToken };
  }

  private async validatePassword(password: string, hash: string | undefined): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  private async handleFailedLogin(user: User, ipAddress: string, userAgent: string): Promise<void> {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= this.maxFailedAttempts) {
      user.lockedUntil = new Date(Date.now() + this.lockoutDuration);
      
      await this.securityLogger.logSecurityEvent({
        type: 'account_locked',
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: { failedAttempts: user.failedLoginAttempts },
        severity: 'high'
      });
    }

    await this.userRepository.save(user);

    await this.securityLogger.logSecurityEvent({
      type: 'login_failure',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      details: { 
        reason: 'invalid_password',
        failedAttempts: user.failedLoginAttempts 
      },
      severity: 'medium'
    });
  }

  private async resetFailedAttempts(user: User): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      await this.userRepository.save(user);
    }
  }

  private mapToAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
}