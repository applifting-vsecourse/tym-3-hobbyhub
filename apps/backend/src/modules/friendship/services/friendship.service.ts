import {
  FRIEND_SEARCH_MAX_RESULTS,
  FRIEND_SEARCH_PAGE_SIZE,
  FriendRelation,
  friendRequestNotifyWindowStart,
  friendRequestViolations,
  FriendSearchPage,
  isFriendRequestNotified,
  relationOf,
} from '@/modules/friendship/domain/friendship';
import {
  FoundUserRow,
  FriendshipRepository,
  PendingRequestExistsError,
} from '@/modules/friendship/repositories/friendship.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** #225: a request just sent, and whether its recipient is to be told (#228). */
export type SentFriendRequest = {
  relation: FriendRelation;
  /** False past the limit of requests from the same sender within an hour. */
  notifyRecipient: boolean;
};

// #227, #225, ADR-0026: what other modules ask about friendships, searching
// people, sending a request and withdrawing it. #228 adds deciding requests, #226 the list of
// friends.
@Injectable()
export class FriendshipService {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly blocks: UserBlockVisibility,
  ) {}

  /**
   * #215, ADR-0026: the friends whose upcoming events the person may see:
   * only those who allowed it. Blocking ends a friendship, so a blocked
   * person is never among them.
   */
  listFriendsSharingUpcomingEvents(userId: string): Promise<FoundUserRow[]> {
    return this.friendshipRepository.listFriendsSharingUpcomingEvents(userId);
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
   * #225: where the viewer stands with each of the people, in one go (the
   * members of a group). Nobody has a relation with themselves.
   */
  async relationsWith(
    viewerId: string,
    otherIds: readonly string[],
  ): Promise<Map<string, FriendRelation>> {
    const others = otherIds.filter((id) => id !== viewerId);
    const stored = await this.friendshipRepository.findRelationsWith(
      viewerId,
      others,
    );
    return new Map(
      otherIds.map((id): [string, FriendRelation] => {
        const between = stored.get(id);
        return [id, between ? relationOf(viewerId, between) : 'none'];
      }),
    );
  }

  /**
   * #225: a page of people whose nickname contains the text, each with the
   * viewer's relation to them. The text arrives trimmed and long enough, the
   * offset within the cap (the DTO). People blocked with the viewer either
   * way (#239) are not found. The pages stop at `FRIEND_SEARCH_MAX_RESULTS`.
   *
   * The three queries run one after another on purpose: the people found
   * depend on the blocks, the relations on the people found.
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
      await this.blockedWith(viewer.id),
    );
    const page = rows.slice(0, FRIEND_SEARCH_PAGE_SIZE);
    const hasMore = rows.length > FRIEND_SEARCH_PAGE_SIZE;
    const next = offset + FRIEND_SEARCH_PAGE_SIZE;
    // Review of #225: no page past the cap, so nobody lists every user.
    const isLastAllowed = next >= FRIEND_SEARCH_MAX_RESULTS;
    const relations = await this.friendshipRepository.findRelationsWith(
      viewer.id,
      page.map((row) => row.id),
    );
    return {
      items: page.map((row) => ({
        id: row.id,
        name: row.name,
        image: row.image,
        relation: relationOf(viewer.id, relations.get(row.id)!),
      })),
      nextOffset: hasMore && !isLastAllowed ? next : null,
      isCapped: hasMore && isLastAllowed,
    };
  }

  /**
   * #225: the signed-in person asks another to become friends. Refused to
   * oneself (400), to an account that does not exist or is blocked or deleted
   * (404), between friends and where a request already waits in either
   * direction (409). A rejected request does not stop a new one. Between a
   * blocked pair (#239, ADR-0026) the answer is the same 404, so neither
   * learns of the block.
   */
  async sendRequest(
    sender: Identity,
    recipientId: string,
  ): Promise<SentFriendRequest> {
    const violations = friendRequestViolations(sender.id, recipientId);
    if (violations.length > 0) throw new BadRequestException(violations);
    // Independent reads, at once; the answers keep their order below.
    const [isSenderActive, isReachable, blocked, isFriend, pendingRequest] =
      await Promise.all([
        this.friendshipRepository.isActive(sender.id),
        this.friendshipRepository.isReachable(recipientId),
        this.blockedWith(sender.id),
        this.friendshipRepository.areFriends(sender.id, recipientId),
        this.friendshipRepository.findPendingRequestBetween(
          sender.id,
          recipientId,
        ),
      ]);
    // ADR-0026: only an active account asks; a restricted one may still be
    // found and accept requests.
    if (!isSenderActive) throw new ForbiddenException(['SENDER_NOT_ACTIVE']);
    if (!isReachable || blocked.includes(recipientId)) {
      throw new NotFoundException('User not found');
    }
    if (isFriend) throw new ConflictException(['ALREADY_FRIENDS']);
    if (pendingRequest) throw new ConflictException(['REQUEST_PENDING']);
    const earlierInWindow = await this.friendshipRepository.countRequestsSince(
      sender.id,
      recipientId,
      friendRequestNotifyWindowStart(new Date()),
    );
    try {
      await this.friendshipRepository.createRequest(sender.id, recipientId);
    } catch (error) {
      // Both sent at the same moment: the database let only one through.
      if (error instanceof PendingRequestExistsError) {
        throw new ConflictException(['REQUEST_PENDING']);
      }
      throw error;
    }
    // #228 notifies the recipient when `notifyRecipient`; any more requests
    // within the hour wait silently in the section Přátelé.
    return {
      relation: 'request_sent',
      notifyRecipient: isFriendRequestNotified(earlierInWindow),
    };
  }

  /**
   * #225: the signed-in person takes back their pending request to the
   * recipient. Refused to oneself (400); 409 when there is no pending request
   * from them (never sent, or decided meanwhile), so the client reloads the
   * real state. #228 removes the recipient's notification of it.
   */
  async withdrawRequest(
    sender: Identity,
    recipientId: string,
  ): Promise<FriendRelation> {
    const violations = friendRequestViolations(sender.id, recipientId);
    if (violations.length > 0) throw new BadRequestException(violations);
    const withdrawn = await this.friendshipRepository.withdrawPendingRequest(
      sender.id,
      recipientId,
      new Date(),
    );
    if (!withdrawn) throw new ConflictException(['NO_PENDING_REQUEST']);
    return 'none';
  }

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

  // #239: the people blocked with the user either way: by an administrator
  // (both ways), or (#65) by one of them. They do not find each other and no
  // request goes between them.
  private async blockedWith(userId: string): Promise<string[]> {
    const [hiddenFor, hiddenFrom] = await Promise.all([
      this.blocks.hiddenFor(userId),
      this.blocks.hiddenFrom(userId),
    ]);
    return [...new Set([...hiddenFor, ...hiddenFrom])];
  }
}
