import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityModule } from '@/modules/activity/activity.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { GroupsController } from './controllers/groups.controller';
import { GroupRepository } from './repositories/group.repository';
import { GroupsService } from './services/groups.service';

@Module({
  imports: [AuthModule, PrismaModule, ActivityModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupRepository],
})
export class GroupModule {}
