import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { UserBlockVisibilityModule } from '@/shared/user-block/user-block.module';
import { Module } from '@nestjs/common';
import { EventRatingsController } from './controllers/event-ratings.controller';
import { RatingsController } from './controllers/ratings.controller';
import { RatingRepository } from './repositories/rating.repository';
import { RatingsService } from './services/ratings.service';

// #236, ADR-0027: ratings after an event and the scores made of them. The
// profile and the event detail ask `RatingsService` for scores; filtering
// events by rating (#246) reads the views in SQL. Depends on no other module
// that could need it, so nothing runs in a circle.
@Module({
  imports: [UserBlockVisibilityModule, AuthModule, PrismaModule],
  controllers: [EventRatingsController, RatingsController],
  providers: [RatingsService, RatingRepository],
  exports: [RatingsService],
})
export class RatingModule {}
