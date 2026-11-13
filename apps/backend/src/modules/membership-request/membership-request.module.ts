import { PrismaModule } from '@/core/prisma/prisma.module';
import { GroupModule } from '@/modules/group/group.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AdminMembershipRequestsController } from './controllers/admin-membership-requests.controller';
import { MembershipRequestsController } from './controllers/membership-requests.controller';
import { MyMembershipRequestsController } from './controllers/my-membership-requests.controller';
import { MembershipRequestRepository } from './repositories/membership-request.repository';
import { MembershipRequestsService } from './services/membership-requests.service';

@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    PrismaModule,
    GroupModule,
    NotificationModule,
  ],
  controllers: [
    MembershipRequestsController,
    MyMembershipRequestsController,
    AdminMembershipRequestsController,
  ],
  providers: [MembershipRequestsService, MembershipRequestRepository],
})
export class MembershipRequestModule {}
