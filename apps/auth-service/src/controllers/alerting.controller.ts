import { Controller, Get, Post, Put, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole, Permission, AuthUser } from '../interfaces/auth.interfaces';
import { AlertingService, Alert, AlertRule } from '../services/alerting.service';

@ApiTags('Security Alerting')
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AlertingController {
  constructor(private alertingService: AlertingService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'Get active security alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved successfully' })
  async getActiveAlerts(): Promise<{ alerts: Alert[]; count: number }> {
    const alerts = await this.alertingService.getActiveAlerts();
    return {
      alerts,
      count: alerts.length,
    };
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.VIEW_AUDIT_LOGS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge a security alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async acknowledgeAlert(
    @Param('id') alertId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string }> {
    await this.alertingService.acknowledgeAlert(alertId, user.id);
    return { message: 'Alert acknowledged successfully' };
  }

  @Get('rules')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_SYSTEM)
  @ApiOperation({ summary: 'Get alert rules configuration' })
  @ApiResponse({ status: 200, description: 'Alert rules retrieved successfully' })
  async getAlertRules(): Promise<{ rules: AlertRule[] }> {
    const rules = await this.alertingService.getAlertRules();
    return { rules };
  }

  @Put('rules/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_SYSTEM)
  @ApiOperation({ summary: 'Update alert rule configuration' })
  @ApiResponse({ status: 200, description: 'Alert rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Alert rule not found' })
  async updateAlertRule(
    @Param('id') ruleId: string,
    @Body() updates: Partial<AlertRule>,
  ): Promise<{ message: string }> {
    await this.alertingService.updateAlertRule(ruleId, updates);
    return { message: 'Alert rule updated successfully' };
  }
}