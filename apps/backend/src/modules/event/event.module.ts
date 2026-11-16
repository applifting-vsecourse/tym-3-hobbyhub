import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityModule } from '@/modules/activity/activity.module';
import { CancellationReasonModule } from '@/modules/cancellation-reason/cancellation-reason.module';
import { GroupModule } from '@/modules/group/group.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { UserBlockVisibilityModule } from '@/shared/user-block/user-block.module';
import { Module } from '@nestjs/common';
import { AdminEventsController } from './controllers/admin-events.controller';
import { AdminUserEventsController } from './controllers/admin-user-events.controller';
import { EventsController } from './controllers/events.controller';
import { GroupEventsController } from './controllers/group-events.controller';
import { EventReminderRepository } from './repositories/event-reminder.repository';
import { EventRepository } from './repositories/event.repository';
import { EventRemindersService } from './services/event-reminders.service';
import { EventsService } from './services/events.service';

@Module({
  imports: [
    UserBlockVisibilityModule,
    AuthModule,
    AdminAuthModule,
    PrismaModule,
    ActivityModule,
    CancellationReasonModule,
    NotificationModule,
    // F-07.2: who is in the group that runs a group-only event.
    GroupModule,
  ],
  controllers: [
    EventsController,
    GroupEventsController,
    AdminEventsController,
    AdminUserEventsController,
  ],
  providers: [
    EventsService,
    EventRepository,
    // #233, ADR-0021: reminders before the start, sent by a poller.
    EventRemindersService,
    EventReminderRepository,
  ],
  exports: [EventsService],
})
export class EventModule {}
