import { PrismaModule } from '@/core/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { UserBlockVisibilityModule } from '@/shared/user-block/user-block.module';
import { Module } from '@nestjs/common';
import { EventRatingsController } from './controllers/event-ratings.controller';
import { RatingsController } from './controllers/ratings.controller';
import { RatingPromptRepository } from './repositories/rating-prompt.repository';
import { RatingRepository } from './repositories/rating.repository';
import { RatingPromptsService } from './services/rating-prompts.service';
import { RatingsService } from './services/ratings.service';

// #236, ADR-0027: ratings after an event, the scores made of them and the
// calls to rate. The profile asks `RatingsService` for scores; the event
// detail and filtering by rating (#246) read the views in SQL. Imports only
// the notifications, which import nothing back, so nothing runs in a circle.
@Module({
  imports: [
    UserBlockVisibilityModule,
    AuthModule,
    PrismaModule,
    // The calls to rate an event (ADR-0015: notifications import nothing back).
    NotificationModule,
  ],
  controllers: [EventRatingsController, RatingsController],
  providers: [
    RatingsService,
    RatingRepository,
    // #236, ADR-0021: the calls to rate an event, sent by a cron.
    RatingPromptsService,
    RatingPromptRepository,
  ],
  exports: [RatingsService],
})
export class RatingModule {}
