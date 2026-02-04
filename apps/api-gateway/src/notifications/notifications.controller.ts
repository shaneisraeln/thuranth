import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class RegisterWebhookDto {
  url: string;
  events: string[];
  secret?: string;
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

class SendNotificationDto {
  userId: string;
  type: string;
  data?: Record<string, any>;
}

class SendBulkNotificationDto {
  userIds: string[];
  type: string;
  data?: Record<string, any>;
}

class RegisterTokenDto {
  userId: string;
  token: string;
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private webhookService: WebhookService,
  ) {}

  // Push Notifications
  @Post('push/send')
  @ApiOperation({ summary: 'Send push notification to a user' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    return this.notificationsService.sendNotification(
      sendNotificationDto.userId,
      sendNotificationDto.type,
      sendNotificationDto.data,
    );
  }

  @Post('push/send-bulk')
  @ApiOperation({ summary: 'Send push notification to multiple users' })
  @ApiResponse({ status: 201, description: 'Bulk notification sent successfully' })
  async sendBulkNotification(@Body() sendBulkNotificationDto: SendBulkNotificationDto) {
    return this.notificationsService.sendBulkNotification(
      sendBulkNotificationDto.userIds,
      sendBulkNotificationDto.type,
      sendBulkNotificationDto.data,
    );
  }

  @Post('push/send-to-role/:role')
  @ApiOperation({ summary: 'Send push notification to all users with a specific role' })
  @ApiResponse({ status: 201, description: 'Role-based notification sent successfully' })
  async sendNotificationToRole(
    @Param('role') role: string,
    @Body() body: { type: string; data?: Record<string, any> }
  ) {
    return this.notificationsService.sendNotificationToRole(role, body.type, body.data);
  }

  @Post('push/register-token')
  @ApiOperation({ summary: 'Register FCM token for a user' })
  @ApiResponse({ status: 201, description: 'Token registered successfully' })
  async registerToken(@Body() registerTokenDto: RegisterTokenDto) {
    await this.notificationsService.registerUserToken(
      registerTokenDto.userId,
      registerTokenDto.token,
    );
    return { success: true };
  }

  @Delete('push/unregister-token')
  @ApiOperation({ summary: 'Unregister FCM token for a user' })
  @ApiResponse({ status: 200, description: 'Token unregistered successfully' })
  async unregisterToken(@Body() registerTokenDto: RegisterTokenDto) {
    await this.notificationsService.unregisterUserToken(
      registerTokenDto.userId,
      registerTokenDto.token,
    );
    return { success: true };
  }

  @Get('push/history/:userId')
  @ApiOperation({ summary: 'Get notification history for a user' })
  @ApiResponse({ status: 200, description: 'Notification history' })
  async getNotificationHistory(@Param('userId') userId: string) {
    return this.notificationsService.getNotificationHistory(userId);
  }

  @Get('push/stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getNotificationStats() {
    return this.notificationsService.getNotificationStats();
  }

  @Post('push/retry/:notificationId')
  @ApiOperation({ summary: 'Retry failed notification' })
  @ApiResponse({ status: 200, description: 'Notification retry result' })
  async retryNotification(@Param('notificationId') notificationId: string) {
    const success = await this.notificationsService.retryFailedNotification(notificationId);
    return { success };
  }

  // Webhooks
  @Post('webhooks')
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
  async registerWebhook(@Body() registerWebhookDto: RegisterWebhookDto) {
    return this.webhookService.registerWebhook(
      registerWebhookDto.url,
      registerWebhookDto.events,
      registerWebhookDto.secret,
      registerWebhookDto.retryConfig,
    );
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List all registered webhooks' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async listWebhooks() {
    return this.webhookService.listWebhooks();
  }

  @Delete('webhooks/:webhookId')
  @ApiOperation({ summary: 'Unregister a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook unregistered successfully' })
  async unregisterWebhook(@Param('webhookId') webhookId: string) {
    const success = await this.webhookService.unregisterWebhook(webhookId);
    return { success };
  }

  @Get('webhooks/:webhookId/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiResponse({ status: 200, description: 'Webhook delivery history' })
  async getWebhookDeliveries(@Param('webhookId') webhookId: string) {
    return this.webhookService.getWebhookDeliveries(webhookId);
  }

  @Get('webhooks/dead-letter-queue')
  @ApiOperation({ summary: 'Get failed webhook deliveries' })
  @ApiResponse({ status: 200, description: 'Failed webhook deliveries' })
  async getDeadLetterQueue() {
    return this.webhookService.getDeadLetterQueue();
  }

  @Post('webhooks/retry/:deliveryId')
  @ApiOperation({ summary: 'Retry failed webhook delivery' })
  @ApiResponse({ status: 200, description: 'Webhook retry result' })
  async retryWebhookDelivery(@Param('deliveryId') deliveryId: string) {
    const success = await this.webhookService.retryFailedDelivery(deliveryId);
    return { success };
  }

  // Test endpoints
  @Post('test/webhook')
  @ApiOperation({ summary: 'Test webhook delivery' })
  @ApiResponse({ status: 200, description: 'Test webhook triggered' })
  async testWebhook(@Body() body: { type: string; data?: any }) {
    const event = {
      id: `test-${Date.now()}`,
      type: body.type,
      data: body.data || { test: true },
      timestamp: new Date(),
      source: 'api-gateway-test',
    };

    await this.webhookService.triggerWebhook(event);
    return { message: 'Test webhook triggered', event };
  }

  @Post('test/push')
  @ApiOperation({ summary: 'Test push notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testPushNotification(@Body() body: { userId: string; type?: string }) {
    const type = body.type || 'system.alert';
    const notification = await this.notificationsService.sendNotification(
      body.userId,
      type,
      { test: true, message: 'This is a test notification' }
    );
    return { message: 'Test notification sent', notification };
  }
}