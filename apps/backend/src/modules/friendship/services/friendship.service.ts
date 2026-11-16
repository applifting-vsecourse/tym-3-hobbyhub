import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import { Injectable } from '@nestjs/common';

// #227, ADR-0026: what other modules ask about friendships. #225 adds where
// two people stand and sending a request, #228 deciding it, #226 the list of
// friends.
@Injectable()
export class FriendshipService {
  constructor(private readonly friendshipRepository: FriendshipRepository) {}

  /**
   * #239, ADR-0022: an administrator blocked the two from each other. Called
   * by the block's clean-up: the friendship ends and pending requests between
   * them are closed, quietly. Nobody is their own friend, so nothing to do.
   */
  async removeBlockedPair(
    oneId: string,
    otherId: string,
    now: Date = new Date(),
  ): Promise<void> {
    if (oneId === otherId) return;
    await this.friendshipRepository.removeBlockedPair(oneId, otherId, now);
  }
}
