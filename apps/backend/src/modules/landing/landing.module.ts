import { EventModule } from '@/modules/event/event.module';
import { FriendshipModule } from '@/modules/friendship/friendship.module';
import { GroupModule } from '@/modules/group/group.module';
import { OnboardingModule } from '@/modules/onboarding/onboarding.module';
import { RatingModule } from '@/modules/rating/rating.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { LandingController } from './controllers/landing.controller';
import { LandingService } from './services/landing.service';

// #215: no data of its own, so no repository: it asks the other modules.
@Module({
  imports: [
    AuthModule,
    EventModule,
    GroupModule,
    // Friends who allowed friends to see their upcoming events (ADR-0026).
    FriendshipModule,
    // The home, the travel radius and the activities of the profile.
    OnboardingModule,
    // The organizer's public score on "Top akce".
    RatingModule,
  ],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
