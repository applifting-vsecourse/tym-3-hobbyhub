import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityModule } from '@/modules/activity/activity.module';
import { CancellationReasonModule } from '@/modules/cancellation-reason/cancellation-reason.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventsController } from './controllers/events.controller';
import { EventRepository } from './repositories/event.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [AuthModule, PrismaModule, ActivityModule, CancellationReasonModule],
  controllers: [EventsController],
  providers: [EventsService, EventRepository],
  exports: [EventsService],
})
export class EventModule {}
