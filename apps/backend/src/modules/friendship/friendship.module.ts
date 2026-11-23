import { PrismaModule } from '@/core/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { UserBlockVisibilityModule } from '@/shared/user-block/user-block.module';
import { Module } from '@nestjs/common';
import { FriendsController } from './controllers/friends.controller';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendshipService } from './services/friendship.service';

// #227, #225, ADR-0026: friendships and friend requests. #225 adds searching
// people and sending a request; #228 deciding it and #226 the list of friends.
// Tells people through NotificationModule, which imports no feature module.
@Module({
  imports: [
    AuthModule,
    PrismaModule,
    NotificationModule,
    UserBlockVisibilityModule,
  ],
  controllers: [FriendsController],
  providers: [FriendshipService, FriendshipRepository],
  exports: [FriendshipService],
})
export class FriendshipModule {}
