import { PrismaModule } from '@/core/prisma/prisma.module';
import { GroupModule } from '@/modules/group/group.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { MembershipRequestsController } from './controllers/membership-requests.controller';
import { MembershipRequestRepository } from './repositories/membership-request.repository';
import { MembershipRequestsService } from './services/membership-requests.service';

@Module({
  imports: [AuthModule, PrismaModule, GroupModule],
  controllers: [MembershipRequestsController],
  providers: [MembershipRequestsService, MembershipRequestRepository],
})
export class MembershipRequestModule {}
