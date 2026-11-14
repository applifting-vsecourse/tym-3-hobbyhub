// #227, ADR-0021: the vocabulary of friendships. Plain TypeScript: no Nest,
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
  /** Past events on the profile. Shown by default. */
  friendsSeeEventHistory: boolean;
  /** Upcoming events on the profile and the name in an event's detail. Hidden by default. */
  friendsSeeUpcomingEvents: boolean;
};

export const DEFAULT_FRIEND_VISIBILITY: FriendVisibility = {
  friendsSeeEventHistory: true,
  friendsSeeUpcomingEvents: false,
};

/**
 * The stored order of a pair, whichever way round it is asked. Compares by
 * UTF-16 code units, which for the ASCII ids of the app is the byte order
 * the database CHECK uses (`COLLATE "C"`).
 */
export function friendPairOf(oneId: string, otherId: string): FriendPair {
  return oneId < otherId
    ? { userAId: oneId, userBId: otherId }
    : { userAId: otherId, userBId: oneId };
}

/** The friend of `userId` in a stored pair. */
export function friendOf(pair: FriendPair, userId: string): string {
  return pair.userAId === userId ? pair.userBId : pair.userAId;
}

export type FriendRequestViolation = 'SELF_REQUEST';

/** Rules of a new request that need no data from elsewhere. Never throws. */
export function friendRequestViolations(
  senderId: string,
  recipientId: string,
): FriendRequestViolation[] {
  return senderId === recipientId ? ['SELF_REQUEST'] : [];
}
