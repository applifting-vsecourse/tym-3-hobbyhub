// #227, ADR-0026: the vocabulary of friendships. Plain TypeScript: no Nest,
// no Prisma, no HTTP.

export const FRIEND_REQUEST_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
] as const;

export type FriendRequestStatus = (typeof FRIEND_REQUEST_STATUSES)[number];

/**
 * One person asks another to become friends. A rejected request stays as a
 * record but does not stop a new one between the same two people (#225).
 */
export type FriendRequest = {
  id: string;
  senderId: string;
  recipientId: string;
  status: FriendRequestStatus;
  requestedAt: Date;
  /** Set exactly when the request is no longer PENDING. */
  decidedAt: Date | null;
};

/**
 * Two people are friends. Symmetric: stored once per pair, the smaller id in
 * `userAId` (see `friendPairOf`).
 */
export type FriendPair = {
  userAId: string;
  userBId: string;
};

/**
 * What the user's friends may see of their events (#227 stores it, #226
 * applies it). Both cover approved participations and organized events only,
 * never pending requests, waitlist places or cancelled events.
 */
export type FriendVisibility = {
  /** Past events on the profile. Shown by default (the column's DEFAULT). */
  friendsSeeEventHistory: boolean;
  /** Upcoming events on the profile and the name in an event's detail. Hidden by default. */
  friendsSeeUpcomingEvents: boolean;
};

/**
 * Orders two strings by Unicode code points: the order of their UTF-8 bytes,
 * which the database CHECK compares (`COLLATE "C"` in a UTF8 database).
 * JavaScript's `<` compares UTF-16 code units instead, which puts a character
 * outside the BMP (an emoji, U+1F600) before U+E000–U+FFFF: the opposite of
 * the bytes. Negative, zero or positive, like a sort comparator.
 */
function compareByCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a.codePointAt(i)!;
    const y = b.codePointAt(j)!;
    if (x !== y) return x - y;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  return a.length - i - (b.length - j);
}

/**
 * The stored order of a pair, whichever way round it is asked: by code
 * points, the same order as the database CHECK `friendship_ordered_pair`.
 * The ids BetterAuth makes are ASCII, but the order holds for any id.
 */
export function friendPairOf(oneId: string, otherId: string): FriendPair {
  return compareByCodePoints(oneId, otherId) < 0
    ? { userAId: oneId, userBId: otherId }
    : { userAId: otherId, userBId: oneId };
}

export type FriendRequestViolation = 'SELF_REQUEST';

/** Rules of a new request that need no data from elsewhere. Never throws. */
export function friendRequestViolations(
  senderId: string,
  recipientId: string,
): FriendRequestViolation[] {
  return senderId === recipientId ? ['SELF_REQUEST'] : [];
}
