import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationEmailsService } from './services/notification-emails.service';
import { NotificationsService } from './services/notifications.service';

// Imports no other feature module (ADR-0015): the modules where things happen
// import this one and hand the facts over, so no dependency runs in a circle.
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsController],
  // The outbox comes from the global MailModule (F-09.5, ADR-0018).
  providers: [
    NotificationsService,
    NotificationEmailsService,
    NotificationRepository,
  ],
  exports: [NotificationsService],
})
export class NotificationModule {}
