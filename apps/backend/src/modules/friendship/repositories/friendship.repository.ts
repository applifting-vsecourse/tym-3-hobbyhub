import { PrismaService } from '@/core/prisma/prisma.service';
import {
  friendPairOf,
  FriendRequest,
} from '@/modules/friendship/domain/friendship';
import { Injectable } from '@nestjs/common';

// #227, ADR-0023. The only place that touches the friendship tables. Trusts
// the layers above: it validates nothing, it only reads and writes. The
// endpoints that create and decide requests come with #225 and #228.
@Injectable()
export class FriendshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Whether the two people are friends, whichever way round they are asked. */
  async areFriends(oneId: string, otherId: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: friendPairOf(oneId, otherId) },
      select: { id: true },
    });
    return friendship !== null;
  }

  /** The pending request between the two people, in either direction. */
  async findPendingRequestBetween(
    oneId: string,
    otherId: string,
  ): Promise<FriendRequest | null> {
    return this.prisma.friendRequest.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { senderId: oneId, recipientId: otherId },
          { senderId: otherId, recipientId: oneId },
        ],
      },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        status: true,
        requestedAt: true,
        decidedAt: true,
      },
    });
  }
}
