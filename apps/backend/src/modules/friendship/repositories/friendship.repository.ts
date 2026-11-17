import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  friendPairOf,
  FriendRequest,
  ReceivedFriendRequest,
} from '@/modules/friendship/domain/friendship';
import { Injectable } from '@nestjs/common';

/** A person as the search shows them, before the relation is added. */
export type FoundUserRow = {
  id: string;
  name: string;
  image: string | null;
};

/** What is stored between the viewer and one other person. */
export type StoredRelation = {
  isFriend: boolean;
  pendingRequest: { senderId: string } | null;
};

/** Accounts a request can reach and whose requests still count. */
const REACHABLE_STATUSES = ['ACTIVE', 'RESTRICTED'] as const;

// #228: the requests waiting for the recipient, from accounts that still count.
const receivedWhere = (
  recipientId: string,
): Prisma.FriendRequestWhereInput => ({
  recipientId,
  status: 'PENDING',
  sender: { status: { in: [...REACHABLE_STATUSES] } },
});

/** The second request for a pair lost the race (friend_request_one_pending_per_pair). */
export class PendingRequestExistsError extends Error {}

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/** `LIKE` treats `%`, `_` and the escape character as wildcards; typed text must not. */
const containsPattern = (text: string): string =>
  `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

// #227, #225, ADR-0026. The only place that touches the friendship tables.
// Trusts the layers above: it validates nothing, it only reads and writes.
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

  /**
   * #225: people whose nickname (`name`, ADR-0025) contains the text, ignoring case and
   * diacritics (unaccent). Never the e-mail, never the viewer, only accounts
   * that are active or restricted, never `excludedIds` (people blocked from the
   * viewer, #239). Ordered by name; `limit` rows from `offset`.
   */
  async searchUsers(
    viewerId: string,
    text: string,
    offset: number,
    limit: number,
    excludedIds: readonly string[] = [],
  ): Promise<FoundUserRow[]> {
    const pattern = containsPattern(text);
    const notExcluded =
      excludedIds.length === 0
        ? Prisma.empty
        : Prisma.sql`AND "id" NOT IN (${Prisma.join([...excludedIds])})`;
    // `name` is the nickname (ADR-0025: always a copy of displayUsername).
    return this.prisma.$queryRaw<FoundUserRow[]>`
      SELECT "id", "name", "image"
      FROM "user"
      WHERE "id" <> ${viewerId}
        ${notExcluded}
        AND "status" IN ('ACTIVE', 'RESTRICTED')
        AND unaccent(lower("name")) LIKE unaccent(lower(${pattern})) ESCAPE '\\'
      ORDER BY unaccent(lower("name")), "id"
      OFFSET ${offset}
      LIMIT ${limit}
    `;
  }

  /** What is stored between the viewer and each of `otherIds`, in one go. */
  async findRelationsWith(
    viewerId: string,
    otherIds: readonly string[],
  ): Promise<Map<string, StoredRelation>> {
    const relations = new Map<string, StoredRelation>(
      otherIds.map((id) => [id, { isFriend: false, pendingRequest: null }]),
    );
    if (otherIds.length === 0) return relations;
    const ids = [...otherIds];
    const [friendships, requests] = await Promise.all([
      this.prisma.friendship.findMany({
        where: {
          OR: [
            { userAId: viewerId, userBId: { in: ids } },
            { userBId: viewerId, userAId: { in: ids } },
          ],
        },
        select: { userAId: true, userBId: true },
      }),
      this.prisma.friendRequest.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { senderId: viewerId, recipientId: { in: ids } },
            { recipientId: viewerId, senderId: { in: ids } },
          ],
        },
        select: { senderId: true, recipientId: true },
      }),
    ]);
    for (const pair of friendships) {
      const otherId = pair.userAId === viewerId ? pair.userBId : pair.userAId;
      relations.get(otherId)!.isFriend = true;
    }
    for (const request of requests) {
      const otherId =
        request.senderId === viewerId ? request.recipientId : request.senderId;
      relations.get(otherId)!.pendingRequest = { senderId: request.senderId };
    }
    return relations;
  }

  /** #225, ADR-0026: whether the account may send a request: it is active. */
  async isActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: 'ACTIVE' },
      select: { id: true },
    });
    return user !== null;
  }

  /** Whether a request can be sent to the person: the account exists and is not blocked or deleted. */
  async isReachable(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: { in: [...REACHABLE_STATUSES] } },
      select: { id: true },
    });
    return user !== null;
  }

  /**
   * #225: a new pending request. The database keeps one pending request per
   * pair in either direction; losing that race throws `PendingRequestExistsError`.
   * Returns the id of the request (#228 links its notification to it).
   */
  async createRequest(senderId: string, recipientId: string): Promise<string> {
    try {
      const request = await this.prisma.friendRequest.create({
        data: { senderId, recipientId },
        select: { id: true },
      });
      return request.id;
    } catch (error) {
      if (isUniqueViolation(error)) throw new PendingRequestExistsError();
      throw error;
    }
  }

  /**
   * #225: how many requests the sender made to the recipient since `since`,
   * whatever became of them (pending, decided or withdrawn).
   */
  countRequestsSince(
    senderId: string,
    recipientId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.friendRequest.count({
      where: { senderId, recipientId, requestedAt: { gte: since } },
    });
  }

  /**
   * #225: the sender takes back their pending request to the recipient. Only
   * a request still pending changes, so one decided meanwhile stays decided;
   * returns the id of the withdrawn request, or null when there was none.
   */
  withdrawPendingRequest(
    senderId: string,
    recipientId: string,
    now: Date,
  ): Promise<string | null> {
    return this.closePendingRequest(senderId, recipientId, 'WITHDRAWN', now);
  }

  /**
   * #228: the recipient rejects the pending request from the sender. Like
   * withdrawing, only a request still pending changes; returns its id, or
   * null when there was none.
   */
  rejectPendingRequest(
    senderId: string,
    recipientId: string,
    now: Date,
  ): Promise<string | null> {
    return this.closePendingRequest(senderId, recipientId, 'REJECTED', now);
  }

  /**
   * #228: the recipient accepts the pending request from the sender. In one
   * transaction the request becomes ACCEPTED and the pair becomes friends;
   * a request no longer pending (decided or withdrawn meanwhile, the other
   * of two decisions at once) changes nothing and gives null.
   */
  acceptPendingRequest(
    senderId: string,
    recipientId: string,
    now: Date,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const [accepted] = await tx.friendRequest.updateManyAndReturn({
        where: { senderId, recipientId, status: 'PENDING' },
        data: { status: 'ACCEPTED', decidedAt: now },
        select: { id: true },
      });
      if (!accepted) return null;
      const pair = friendPairOf(senderId, recipientId);
      // Already friends cannot happen next to a pending request (#225 checks
      // it before sending); should it, the pair stays as it is.
      await tx.friendship.upsert({
        where: { userAId_userBId: pair },
        create: pair,
        update: {},
      });
      return accepted.id;
    });
  }

  /**
   * #228: the requests waiting for the recipient, newest first, `limit` from
   * `offset`, and how many there are. Requests from a blocked or deleted
   * account are left out, as the search leaves the account out.
   */
  async listReceivedRequests(
    recipientId: string,
    offset: number,
    limit: number,
  ): Promise<{ items: ReceivedFriendRequest[]; total: number }> {
    const where = receivedWhere(recipientId);
    const [rows, total] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where,
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          requestedAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      this.prisma.friendRequest.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        requestedAt: row.requestedAt,
        sender: {
          id: row.sender.id,
          name: row.sender.name,
          image: row.sender.image,
        },
      })),
      total,
    };
  }

  private async closePendingRequest(
    senderId: string,
    recipientId: string,
    status: 'WITHDRAWN' | 'REJECTED',
    now: Date,
  ): Promise<string | null> {
    const [closed] = await this.prisma.friendRequest.updateManyAndReturn({
      where: { senderId, recipientId, status: 'PENDING' },
      data: { status, decidedAt: now },
      select: { id: true },
    });
    return closed?.id ?? null;
  }

  /**
   * #239, ADR-0022, ADR-0026: an administrator blocked the two from each
   * other. Their friendship goes, and the requests still pending between them
   * in either direction end as REJECTED with today's date: a rejection is
   * silent, so neither learns of the block. Requests are never deleted. Safe
   * to run again.
   */
  async removeBlockedPair(
    oneId: string,
    otherId: string,
    now: Date,
  ): Promise<string[]> {
    const [, closed] = await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: friendPairOf(oneId, otherId),
      }),
      this.prisma.friendRequest.updateManyAndReturn({
        where: {
          status: 'PENDING',
          OR: [
            { senderId: oneId, recipientId: otherId },
            { senderId: otherId, recipientId: oneId },
          ],
        },
        data: { status: 'REJECTED', decidedAt: now },
        select: { id: true },
      }),
    ]);
    // #228: their notifications go too.
    return closed.map((request) => request.id);
  }

  /** #228: how many requests wait for the recipient, for the number on the tab. */
  countReceivedRequests(recipientId: string): Promise<number> {
    return this.prisma.friendRequest.count({
      where: receivedWhere(recipientId),
    });
  }
}
