import {
  FRIEND_SEARCH_PAGE_SIZE,
  FriendRelation,
  FriendRequest,
  friendRequestViolations,
  FriendSearchPage,
  relationOf,
} from '@/modules/friendship/domain/friendship';
import {
  FriendshipRepository,
  PendingRequestExistsError,
} from '@/modules/friendship/repositories/friendship.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// #227, #225, ADR-0023: what other modules ask about friendships, searching
// people and sending a request. #228 adds deciding requests, #226 the list of
// friends.
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

  /** #225: where the viewer stands with the other person, for their profile. */
  async relationBetween(
    viewerId: string,
    otherId: string,
  ): Promise<FriendRelation> {
    if (viewerId === otherId) return 'none';
    const [isFriend, pendingRequest] = await Promise.all([
      this.friendshipRepository.areFriends(viewerId, otherId),
      this.friendshipRepository.findPendingRequestBetween(viewerId, otherId),
    ]);
    return relationOf(viewerId, { isFriend, pendingRequest });
  }

  /**
   * #225: a page of people whose name or username contains the text, each
   * with the viewer's relation to them. The text arrives trimmed and long
   * enough (the DTO).
   */
  async search(
    viewer: Identity,
    text: string,
    offset: number,
  ): Promise<FriendSearchPage> {
    // One row more than the page tells whether another page follows, without a total.
    const rows = await this.friendshipRepository.searchUsers(
      viewer.id,
      text,
      offset,
      FRIEND_SEARCH_PAGE_SIZE + 1,
    );
    const page = rows.slice(0, FRIEND_SEARCH_PAGE_SIZE);
    const relations = await this.friendshipRepository.findRelationsWith(
      viewer.id,
      page.map((row) => row.id),
    );
    return {
      items: page.map((row) => ({
        id: row.id,
        name: row.name,
        nickname: row.nickname,
        image: row.image,
        relation: relationOf(viewer.id, relations.get(row.id)!),
      })),
      nextOffset:
        rows.length > FRIEND_SEARCH_PAGE_SIZE
          ? offset + FRIEND_SEARCH_PAGE_SIZE
          : null,
    };
  }

  /**
   * #225: the signed-in person asks another to become friends. Refused to
   * oneself (400), to an account that does not exist or is blocked or deleted
   * (404), between friends and where a request already waits in either
   * direction (409). A rejected request does not stop a new one.
   */
  async sendRequest(
    sender: Identity,
    recipientId: string,
  ): Promise<FriendRelation> {
    const violations = friendRequestViolations(sender.id, recipientId);
    if (violations.length > 0) throw new BadRequestException(violations);
    if (!(await this.friendshipRepository.isReachable(recipientId))) {
      throw new NotFoundException('User not found');
    }
    if (await this.friendshipRepository.areFriends(sender.id, recipientId)) {
      throw new ConflictException(['ALREADY_FRIENDS']);
    }
    if (
      await this.friendshipRepository.findPendingRequestBetween(
        sender.id,
        recipientId,
      )
    ) {
      throw new ConflictException(['REQUEST_PENDING']);
    }
    try {
      await this.friendshipRepository.createRequest(sender.id, recipientId);
    } catch (error) {
      // Both sent at the same moment: the database let only one through.
      if (error instanceof PendingRequestExistsError) {
        throw new ConflictException(['REQUEST_PENDING']);
      }
      throw error;
    }
    return 'request_sent';
  }
}
