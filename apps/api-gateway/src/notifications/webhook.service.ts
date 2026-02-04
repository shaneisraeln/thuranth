import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  createdAt: Date;
  lastTriggered?: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  response?: {
    status: number;
    body: string;
    headers: Record<string, string>;
  };
  error?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private webhooks: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private deadLetterQueue: WebhookDelivery[] = [];

  constructor(private configService: ConfigService) {
    // Start processing queue
    this.processDeliveryQueue();
  }

  async registerWebhook(
    url: string,
    events: string[],
    secret?: string,
    retryConfig?: Partial<WebhookEndpoint['retryConfig']>
  ): Promise<WebhookEndpoint> {
    const webhook: WebhookEndpoint = {
      id: this.generateId(),
      url,
      events,
      secret,
      isActive: true,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        ...retryConfig,
      },
      createdAt: new Date(),
    };

    this.webhooks.set(webhook.id, webhook);
    this.logger.log(`Registered webhook ${webhook.id} for events: ${events.join(', ')}`);
    
    return webhook;
  }

  async unregisterWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return false;
    }

    webhook.isActive = false;
    this.logger.log(`Unregistered webhook ${webhookId}`);
    return true;
  }

  async triggerWebhook(event: WebhookEvent): Promise<void> {
    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => 
        webhook.isActive && 
        webhook.events.includes(event.type)
      );

    if (matchingWebhooks.length === 0) {
      this.logger.debug(`No webhooks registered for event type: ${event.type}`);
      return;
    }

    for (const webhook of matchingWebhooks) {
      const delivery: WebhookDelivery = {
        id: this.generateId(),
        webhookId: webhook.id,
        eventId: event.id,
        url: webhook.url,
        status: 'pending',
        attempts: 0,
      };

      this.deliveryQueue.push(delivery);
      webhook.lastTriggered = new Date();
    }

    this.logger.log(`Queued ${matchingWebhooks.length} webhook deliveries for event ${event.type}`);
  }

  private async processDeliveryQueue(): Promise<void> {
    setInterval(async () => {
      const pendingDeliveries = this.deliveryQueue.filter(
        delivery => delivery.status === 'pending' || 
        (delivery.status === 'retrying' && delivery.nextRetry && delivery.nextRetry <= new Date())
      );

      for (const delivery of pendingDeliveries) {
        await this.attemptDelivery(delivery);
      }
    }, 5000); // Process every 5 seconds
  }

  private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook || !webhook.isActive) {
      delivery.status = 'failed';
      delivery.error = 'Webhook not found or inactive';
      return;
    }

    try {
      delivery.attempts++;
      delivery.lastAttempt = new Date();
      delivery.status = 'retrying';

      const event = this.getEventById(delivery.eventId);
      if (!event) {
        delivery.status = 'failed';
        delivery.error = 'Event not found';
        return;
      }

      const payload = {
        id: event.id,
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
        source: event.source,
        webhook_id: webhook.id,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'PDCP-Webhook/1.0',
        'X-Webhook-Event': event.type,
        'X-Webhook-ID': webhook.id,
        'X-Webhook-Delivery': delivery.id,
      };

      // Add signature if secret is provided
      if (webhook.secret) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      });

      delivery.response = {
        status: response.status,
        body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        headers: response.headers as Record<string, string>,
      };

      if (response.status >= 200 && response.status < 300) {
        delivery.status = 'delivered';
        this.logger.log(`Webhook delivered successfully: ${delivery.id}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      delivery.error = error.message;
      
      if (delivery.attempts >= webhook.retryConfig.maxRetries) {
        delivery.status = 'failed';
        this.deadLetterQueue.push(delivery);
        this.logger.error(`Webhook delivery failed permanently: ${delivery.id} - ${error.message}`);
      } else {
        delivery.status = 'retrying';
        delivery.nextRetry = new Date(
          Date.now() + 
          webhook.retryConfig.initialDelay * 
          Math.pow(webhook.retryConfig.backoffMultiplier, delivery.attempts - 1)
        );
        this.logger.warn(`Webhook delivery failed, will retry: ${delivery.id} - ${error.message}`);
      }
    }
  }

  private generateSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEventById(eventId: string): WebhookEvent | null {
    // In a real implementation, this would query from a database or cache
    // For now, return a mock event
    return {
      id: eventId,
      type: 'parcel.assigned',
      data: { parcelId: 'test-parcel', vehicleId: 'test-vehicle' },
      timestamp: new Date(),
      source: 'decision-engine',
    };
  }

  // Management methods
  async listWebhooks(): Promise<WebhookEndpoint[]> {
    return Array.from(this.webhooks.values());
  }

  async getWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    return this.deliveryQueue.filter(delivery => delivery.webhookId === webhookId);
  }

  async getDeadLetterQueue(): Promise<WebhookDelivery[]> {
    return [...this.deadLetterQueue];
  }

  async retryFailedDelivery(deliveryId: string): Promise<boolean> {
    const delivery = this.deadLetterQueue.find(d => d.id === deliveryId);
    if (!delivery) {
      return false;
    }

    // Reset delivery status and move back to main queue
    delivery.status = 'pending';
    delivery.attempts = 0;
    delivery.error = undefined;
    delivery.nextRetry = undefined;

    this.deliveryQueue.push(delivery);
    this.deadLetterQueue = this.deadLetterQueue.filter(d => d.id !== deliveryId);

    return true;
  }
}