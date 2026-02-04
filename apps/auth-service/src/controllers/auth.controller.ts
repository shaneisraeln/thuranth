import { Controller, Post, Body, Req, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthService } from '../services/jwt-auth.service';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, AuthUser } from '../interfaces/auth.interfaces';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private jwtAuthService: JwtAuthService,
    private firebaseAuthService: FirebaseAuthService,
    private securityLogger: SecurityLoggerService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginRequest: LoginRequest,
    @Req() req: Request,
  ): Promise<LoginResponse> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.jwtAuthService.login(loginRequest, ipAddress, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() refreshRequest: RefreshTokenRequest,
    @Req() req: Request,
  ): Promise<RefreshTokenResponse> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.jwtAuthService.refreshToken(refreshRequest, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    await this.securityLogger.logSecurityEvent({
      type: 'logout',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      details: {},
      severity: 'low'
    });

    return { message: 'Logout successful' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return user;
  }

  @Get('firebase/profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (Firebase auth)' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getFirebaseProfile(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return user;
  }

  @Get('health')
  @ApiOperation({ summary: 'Check authentication service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): { status: string; firebase: boolean; timestamp: string } {
    return {
      status: 'healthy',
      firebase: this.firebaseAuthService.isConfigured(),
      timestamp: new Date().toISOString()
    };
  }
}