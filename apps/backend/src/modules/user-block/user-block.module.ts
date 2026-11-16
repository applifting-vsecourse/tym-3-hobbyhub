import { PrismaModule } from '@/core/prisma/prisma.module';
import { GroupModule } from '@/modules/group/group.module';
import { MembershipRequestModule } from '@/modules/membership-request/membership-request.module';
import { ParticipationRequestModule } from '@/modules/participation-request/participation-request.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { Module } from '@nestjs/common';
import { AdminUserBlocksController } from './controllers/admin-user-blocks.controller';
import { UserBlockRepository } from './repositories/user-block.repository';
import { UserBlocksService } from './services/user-blocks.service';

// #239, ADR-0022: an administrator blocks two people from each other. The
// read side every module asks lives in shared/user-block; this module writes
// the blocks and undoes what already ties the two together, through the
// other modules' services.
@Module({
  imports: [
    AdminAuthModule,
    PrismaModule,
    GroupModule,
    MembershipRequestModule,
    ParticipationRequestModule,
  ],
  controllers: [AdminUserBlocksController],
  providers: [UserBlocksService, UserBlockRepository],
})
export class UserBlockModule {}
