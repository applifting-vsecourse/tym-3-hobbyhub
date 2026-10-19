import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ActivitiesController } from './controllers/activities.controller';
import { ActivityRepository } from './repositories/activity.repository';
import { ActivitiesService } from './services/activities.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityRepository],
  exports: [ActivitiesService],
})
export class ActivityModule {}
