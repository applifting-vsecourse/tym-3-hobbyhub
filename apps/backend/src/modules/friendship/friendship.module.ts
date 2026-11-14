import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendshipService } from './services/friendship.service';

// #227, ADR-0021: friendships and friend requests. No controller yet: the
// endpoints come with #225 (search, send a request), #228 (decide) and #226
// (the list of friends, remove a friend).
@Module({
  imports: [PrismaModule],
  providers: [FriendshipService, FriendshipRepository],
  exports: [FriendshipService],
})
export class FriendshipModule {}
