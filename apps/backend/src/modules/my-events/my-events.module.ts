import { EventModule } from '@/modules/event/event.module';
import { ParticipationRequestModule } from '@/modules/participation-request/participation-request.module';
import { RatingModule } from '@/modules/rating/rating.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { MyEventsController } from './controllers/my-events.controller';
import { MyEventsService } from './services/my-events.service';

@Module({
  imports: [
    AuthModule,
    EventModule,
    ParticipationRequestModule,
    // #234: which of the person's past events they may still rate.
    RatingModule,
  ],
  controllers: [MyEventsController],
  providers: [MyEventsService],
})
export class MyEventsModule {}
