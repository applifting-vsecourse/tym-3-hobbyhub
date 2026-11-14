import { FriendRequest } from '@/modules/friendship/domain/friendship';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import { Injectable } from '@nestjs/common';

// #227, ADR-0021: what other modules ask about friendships. #225 and #228 add
// sending and deciding requests, #226 the list of friends.
@Injectable()
export class FriendshipService {
  constructor(private readonly friendshipRepository: FriendshipRepository) {}

  /** Whether the two people are friends. Nobody is their own friend. */
  async areFriends(oneId: string, otherId: string): Promise<boolean> {
    if (oneId === otherId) return false;
    return this.friendshipRepository.areFriends(oneId, otherId);
  }

  /** The request still waiting between the two people, in either direction. */
  async pendingRequestBetween(
    oneId: string,
    otherId: string,
  ): Promise<FriendRequest | null> {
    if (oneId === otherId) return null;
    return this.friendshipRepository.findPendingRequestBetween(oneId, otherId);
  }
}
