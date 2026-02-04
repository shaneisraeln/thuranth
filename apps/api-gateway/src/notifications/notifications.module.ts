import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WebhookService } from './webhook.service';
import { NotificationsController } from './notifications.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [NotificationsService, WebhookService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WebhookService],
})
export class NotificationsModule {}