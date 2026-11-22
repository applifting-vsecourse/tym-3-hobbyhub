import { PrismaModule } from '@/core/prisma/prisma.module';
import { EventModule } from '@/modules/event/event.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { UserBlockVisibilityModule } from '@/shared/user-block/user-block.module';
import { Module } from '@nestjs/common';
import { EventInterestsController } from './controllers/event-interests.controller';
import { EventInterestRepository } from './repositories/event-interest.repository';
import { EventInterestsService } from './services/event-interests.service';

// #231, ADR-0030: the "Zajímá mě" list.
@Module({
  imports: [UserBlockVisibilityModule, AuthModule, PrismaModule, EventModule],
  controllers: [EventInterestsController],
  providers: [EventInterestsService, EventInterestRepository],
  exports: [EventInterestsService],
})
export class EventInterestModule {}
