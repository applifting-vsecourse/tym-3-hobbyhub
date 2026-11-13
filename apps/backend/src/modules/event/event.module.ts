import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityModule } from '@/modules/activity/activity.module';
import { CancellationReasonModule } from '@/modules/cancellation-reason/cancellation-reason.module';
import { GroupModule } from '@/modules/group/group.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AdminEventsController } from './controllers/admin-events.controller';
import { AdminUserEventsController } from './controllers/admin-user-events.controller';
import { EventsController } from './controllers/events.controller';
import { GroupEventsController } from './controllers/group-events.controller';
import { EventRepository } from './repositories/event.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [
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
  providers: [EventsService, EventRepository],
  exports: [EventsService],
})
export class EventModule {}
