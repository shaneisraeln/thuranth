import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority: 'high' | 'normal';
  type: string;
  createdAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
  priority: 'high' | 'normal';
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App;
  private notifications: Map<string, PushNotification> = new Map();
  private userTokens: Map<string, string[]> = new Map(); // userId -> FCM tokens
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
    this.initializeTemplates();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = {
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
      };

      if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin initialized successfully');
      } else {
        this.logger.warn('Firebase credentials not provided, push notifications will be mocked');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase: ${error.message}`);
    }
  }

  private initializeTemplates() {
    const templates: NotificationTemplate[] = [
      {
        type: 'parcel.assigned',
        title: 'New Parcel Assignment',
        body: 'You have been assigned a new parcel for delivery',
        priority: 'high',
        data: { action: 'view_route' },
      },
      {
        type: 'parcel.delivered',
        title: 'Delivery Completed',
        body: 'Parcel has been successfully delivered',
        priority: 'normal',
        data: { action: 'update_status' },
      },
      {
        type: 'sla.risk',
        title: 'SLA Risk Alert',
        body: 'Parcel delivery is at risk of SLA violation',
        priority: 'high',
        data: { action: 'view_parcel' },
      },
      {
        type: 'vehicle.capacity',
        title: 'Vehicle Near Capacity',
        body: 'Vehicle is approaching maximum capacity',
        priority: 'normal',
        data: { action: 'view_vehicle' },
      },
      {
        type: 'route.updated',
        title: 'Route Updated',
        body: 'Your delivery route has been updated',
        priority: 'high',
        data: { action: 'view_route' },
      },
      {
        type: 'system.alert',
        title: 'System Alert',
        body: 'System requires attention',
        priority: 'high',
        data: { action: 'view_dashboard' },
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });

    this.logger.log(`Initialized ${templates.length} notification templates`);
  }

  async registerUserToken(userId: string, token: string): Promise<void> {
    const userTokens = this.userTokens.get(userId) || [];
    if (!userTokens.includes(token)) {
      userTokens.push(token);
      this.userTokens.set(userId, userTokens);
      this.logger.log(`Registered FCM token for user ${userId}`);
    }
  }

  async unregisterUserToken(userId: string, token: string): Promise<void> {
    const userTokens = this.userTokens.get(userId) || [];
    const updatedTokens = userTokens.filter(t => t !== token);
    this.userTokens.set(userId, updatedTokens);
    this.logger.log(`Unregistered FCM token for user ${userId}`);
  }

  async sendNotification(
    userId: string,
    type: string,
    data?: Record<string, any>
  ): Promise<PushNotification> {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Notification template not found: ${type}`);
    }

    const notification: PushNotification = {
      id: this.generateId(),
      userId,
      title: this.interpolateTemplate(template.title, data),
      body: this.interpolateTemplate(template.body, data),
      data: { ...template.data, ...this.stringifyData(data) },
      priority: template.priority,
      type,
      createdAt: new Date(),
      status: 'pending',
    };

    this.notifications.set(notification.id, notification);

    // Send the notification
    await this.deliverNotification(notification);

    return notification;
  }

  async sendBulkNotification(
    userIds: string[],
    type: string,
    data?: Record<string, any>
  ): Promise<PushNotification[]> {
    const notifications = await Promise.all(
      userIds.map(userId => this.sendNotification(userId, type, data))
    );

    this.logger.log(`Sent bulk notification to ${userIds.length} users`);
    return notifications;
  }

  async sendNotificationToRole(
    role: string,
    type: string,
    data?: Record<string, any>
  ): Promise<PushNotification[]> {
    // In a real implementation, this would query users by role from database
    const usersByRole = this.getUsersByRole(role);
    return this.sendBulkNotification(usersByRole, type, data);
  }

  private async deliverNotification(notification: PushNotification): Promise<void> {
    try {
      const userTokens = this.userTokens.get(notification.userId) || [];
      
      if (userTokens.length === 0) {
        notification.status = 'failed';
        notification.error = 'No FCM tokens registered for user';
        this.logger.warn(`No FCM tokens for user ${notification.userId}`);
        return;
      }

      if (!this.firebaseApp) {
        // Mock delivery for development
        notification.status = 'sent';
        notification.sentAt = new Date();
        this.logger.log(`Mock notification sent to user ${notification.userId}: ${notification.title}`);
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: userTokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: 'pdcp_notifications',
            priority: notification.priority === 'high' ? 'high' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      
      notification.status = 'sent';
      notification.sentAt = new Date();

      if (response.failureCount > 0) {
        this.logger.warn(`Notification partially failed: ${response.failureCount}/${response.responses.length} failed`);
        
        // Remove invalid tokens
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(userTokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          const validTokens = userTokens.filter(token => !invalidTokens.includes(token));
          this.userTokens.set(notification.userId, validTokens);
          this.logger.log(`Removed ${invalidTokens.length} invalid tokens for user ${notification.userId}`);
        }
      }

      this.logger.log(`Notification sent successfully: ${notification.id}`);

    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
    }
  }

  private interpolateTemplate(template: string, data?: Record<string, any>): string {
    if (!data) return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private stringifyData(data?: Record<string, any>): Record<string, string> {
    if (!data) return {};

    const stringData: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    });

    return stringData;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUsersByRole(role: string): string[] {
    // Mock implementation - in real app, this would query the database
    const mockUsers: Record<string, string[]> = {
      dispatcher: ['dispatcher1', 'dispatcher2'],
      driver: ['driver1', 'driver2', 'driver3'],
      admin: ['admin1'],
    };

    return mockUsers[role] || [];
  }

  // Management methods
  async getNotificationHistory(userId: string): Promise<PushNotification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getNotificationStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    const notifications = Array.from(this.notifications.values());
    
    return {
      total: notifications.length,
      sent: notifications.filter(n => n.status === 'sent').length,
      failed: notifications.filter(n => n.status === 'failed').length,
      pending: notifications.filter(n => n.status === 'pending').length,
    };
  }

  async retryFailedNotification(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== 'failed') {
      return false;
    }

    notification.status = 'pending';
    notification.error = undefined;
    
    await this.deliverNotification(notification);
    return true;
  }
}