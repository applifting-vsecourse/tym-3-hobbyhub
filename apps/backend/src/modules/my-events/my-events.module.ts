import { EventModule } from '@/modules/event/event.module';
import { ParticipationRequestModule } from '@/modules/participation-request/participation-request.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { MyEventsController } from './controllers/my-events.controller';
import { MyEventsService } from './services/my-events.service';

@Module({
  imports: [AuthModule, EventModule, ParticipationRequestModule],
  controllers: [MyEventsController],
  providers: [MyEventsService],
})
export class MyEventsModule {}
