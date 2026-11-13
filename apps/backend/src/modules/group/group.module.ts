import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityModule } from '@/modules/activity/activity.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AdminGroupsController } from './controllers/admin-groups.controller';
import { GroupsController } from './controllers/groups.controller';
import { GroupRepository } from './repositories/group.repository';
import { GroupsService } from './services/groups.service';

@Module({
  imports: [AuthModule, AdminAuthModule, PrismaModule, ActivityModule],
  controllers: [GroupsController, AdminGroupsController],
  providers: [GroupsService, GroupRepository],
  // Membership requests (F-07.3) ask who manages a group and who is in it.
  exports: [GroupsService],
})
export class GroupModule {}
