import {
  FRIEND_SEARCH_MAX_RESULTS,
  FRIEND_SEARCH_PAGE_SIZE,
  FriendRelation,
  friendRequestNotifyWindowStart,
  friendRequestViolations,
  FriendSearchPage,
  isFriendRequestNotified,
  RECEIVED_FRIEND_REQUESTS_PAGE_SIZE,
  ReceivedFriendRequestPage,
  relationOf,
} from '@/modules/friendship/domain/friendship';
import {
  FriendshipRepository,
  PendingRequestExistsError,
} from '@/modules/friendship/repositories/friendship.repository';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
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

// #227, #225, #228, ADR-0026: what other modules ask about friendships,
// searching people, sending a request, withdrawing it and deciding it. #226
// adds the list of friends.
@Injectable()
export class FriendshipService {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly notifications: NotificationsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

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
    let requestId: string;
    try {
      requestId = await this.friendshipRepository.createRequest(
        sender.id,
        recipientId,
      );
    } catch (error) {
      // Both sent at the same moment: the database let only one through.
      if (error instanceof PendingRequestExistsError) {
        throw new ConflictException(['REQUEST_PENDING']);
      }
      throw error;
    }
    // #228: the recipient is told, in the bell and by e-mail, unless the
    // sender is over the limit; then the request waits silently in the tab
    // „Žádosti“ of the section Přátelé.
    const notifyRecipient = isFriendRequestNotified(earlierInWindow);
    if (notifyRecipient) {
      await this.notifications.notifyFriendRequest({
        request: { id: requestId },
        sender,
        recipientId,
      });
    }
    return { relation: 'request_sent', notifyRecipient };
  }

  /**
   * #225: the signed-in person takes back their pending request to the
   * recipient. Refused to oneself (400); 409 when there is no pending request
   * from them (never sent, or decided meanwhile), so the client reloads the
   * real state. The recipient's notification of it goes too (#228).
   */
  async withdrawRequest(
    sender: Identity,
    recipientId: string,
  ): Promise<FriendRelation> {
    const violations = friendRequestViolations(sender.id, recipientId);
    if (violations.length > 0) throw new BadRequestException(violations);
    const withdrawnId = await this.friendshipRepository.withdrawPendingRequest(
      sender.id,
      recipientId,
      new Date(),
    );
    if (!withdrawnId) throw new ConflictException(['NO_PENDING_REQUEST']);
    await this.notifications.removeFriendRequestNotifications({
      id: withdrawnId,
    });
    return 'none';
  }

  /**
   * #228: the requests waiting for the signed-in person, newest first, a page
   * at a time, with how many there are. Not from people blocked with them
   * either way (review #257): deciding those ends in 404, as `checkDecidable`.
   */
  async listReceivedRequests(
    recipient: Identity,
    offset: number,
  ): Promise<ReceivedFriendRequestPage> {
    const { items, total } =
      await this.friendshipRepository.listReceivedRequests(
        recipient.id,
        offset,
        RECEIVED_FRIEND_REQUESTS_PAGE_SIZE,
        await this.blockedWith(recipient.id),
      );
    return {
      items,
      total,
      nextOffset:
        items.length > 0 && offset + items.length < total
          ? offset + items.length
          : null,
    };
  }

  /** #228: how many requests wait for the signed-in person (the tab's number), the same ones. */
  async countReceivedRequests(recipient: Identity): Promise<number> {
    return this.friendshipRepository.countReceivedRequests(
      recipient.id,
      await this.blockedWith(recipient.id),
    );
  }

  /**
   * #228: the signed-in person accepts the pending request from the sender:
   * they become friends and the sender is told. Only the recipient decides,
   * and only a pending request: refused to oneself (400), from an account
   * that is blocked or deleted (404), and 409 when nothing waits (decided
   * elsewhere, withdrawn), so the client reloads the real state.
   */
  async acceptRequest(
    recipient: Identity,
    senderId: string,
  ): Promise<FriendRelation> {
    await this.checkDecidable(recipient, senderId);
    const requestId = await this.friendshipRepository.acceptPendingRequest(
      senderId,
      recipient.id,
      new Date(),
    );
    if (!requestId) throw new ConflictException(['NO_PENDING_REQUEST']);
    // Independent, so at once; neither throws (NotificationsService).
    await Promise.all([
      this.notifications.markFriendRequestNotificationRead(recipient, {
        id: requestId,
      }),
      this.notifications.notifyFriendRequestAccepted({
        request: { id: requestId },
        senderId,
        acceptedBy: recipient,
      }),
    ]);
    return 'friends';
  }

  /**
   * #228: the signed-in person rejects the pending request from the sender.
   * Silent: the sender is told nothing and may ask again. Refused like
   * accepting.
   */
  async rejectRequest(
    recipient: Identity,
    senderId: string,
  ): Promise<FriendRelation> {
    await this.checkDecidable(recipient, senderId);
    const requestId = await this.friendshipRepository.rejectPendingRequest(
      senderId,
      recipient.id,
      new Date(),
    );
    if (!requestId) throw new ConflictException(['NO_PENDING_REQUEST']);
    await this.notifications.markFriendRequestNotificationRead(recipient, {
      id: requestId,
    });
    return 'none';
  }

  private async checkDecidable(
    recipient: Identity,
    senderId: string,
  ): Promise<void> {
    const violations = friendRequestViolations(senderId, recipient.id);
    if (violations.length > 0) throw new BadRequestException(violations);
    // #239: like sending, nothing passes between a blocked pair, and the
    // answer is the one of an unknown account.
    const [isReachable, blocked] = await Promise.all([
      this.friendshipRepository.isReachable(senderId),
      this.blockedWith(recipient.id),
    ]);
    if (!isReachable || blocked.includes(senderId)) {
      throw new NotFoundException('User not found');
    }
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
    // #228: the notifications of the closed requests go with them, in the
    // repository's one transaction (review #257).
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
