import { PrismaModule } from '@/core/prisma/prisma.module';
import { EventModule } from '@/modules/event/event.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { ParticipationRequestsController } from './controllers/participation-requests.controller';
import { ParticipationsController } from './controllers/participations.controller';
import { ParticipationRequestRepository } from './repositories/participation-request.repository';
import { ParticipationRequestsService } from './services/participation-requests.service';

@Module({
  imports: [AuthModule, PrismaModule, EventModule, NotificationModule],
  controllers: [ParticipationRequestsController, ParticipationsController],
  providers: [ParticipationRequestsService, ParticipationRequestRepository],
  exports: [ParticipationRequestsService],
})
export class ParticipationRequestModule {}
