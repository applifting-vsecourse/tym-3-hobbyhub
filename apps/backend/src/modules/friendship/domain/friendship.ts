// #227, ADR-0023: the vocabulary of friendships. Plain TypeScript: no Nest,
// no Prisma, no HTTP.

export const FRIEND_REQUEST_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  // #225: the sender took it back before it was decided.
  'WITHDRAWN',
] as const;

export type FriendRequestStatus = (typeof FRIEND_REQUEST_STATUSES)[number];

/**
 * One person asks another to become friends. A rejected or withdrawn request
 * stays as a record but does not stop a new one between the same two people
 * (#225).
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
 * The stored order of a pair, whichever way round it is asked. Compares by
 * UTF-16 code units, which for the ASCII ids of the app is the byte order
 * the database CHECK uses (`COLLATE "C"`).
 */
export function friendPairOf(oneId: string, otherId: string): FriendPair {
  return oneId < otherId
    ? { userAId: oneId, userBId: otherId }
    : { userAId: otherId, userBId: oneId };
}

/**
 * Where the viewer stands with another person (#225), as the profile and the
 * search show it: no relation, I asked, they ask me, we are friends.
 */
export const FRIEND_RELATIONS = [
  'none',
  'request_sent',
  'request_received',
  'friends',
] as const;

export type FriendRelation = (typeof FRIEND_RELATIONS)[number];

/**
 * The viewer's relation to the other person from what is stored between
 * them. Friendship wins over a request; a pending request counts by who sent it.
 */
export function relationOf(
  viewerId: string,
  between: {
    isFriend: boolean;
    pendingRequest: Pick<FriendRequest, 'senderId'> | null;
  },
): FriendRelation {
  if (between.isFriend) return 'friends';
  if (!between.pendingRequest) return 'none';
  return between.pendingRequest.senderId === viewerId
    ? 'request_sent'
    : 'request_received';
}

// #225: searching people. From 2 characters, so one letter cannot list
// everybody; a page of 20, never a total.
export const FRIEND_SEARCH_MIN_LENGTH = 2;
export const FRIEND_SEARCH_MAX_LENGTH = 100;
export const FRIEND_SEARCH_PAGE_SIZE = 20;

/**
 * One person found by the search: only what the public profile shows (the
 * visibility matrix), never the e-mail.
 */
export type FriendSearchResult = {
  id: string;
  name: string;
  /** The username, when the person has one. */
  nickname: string | null;
  image: string | null;
  relation: FriendRelation;
};

export type FriendSearchPage = {
  items: FriendSearchResult[];
  /** Where the next page starts; null on the last one. */
  nextOffset: number | null;
};

// #225: a person may ask the same person again and again (a rejection is
// silent, a request can be withdrawn), so the recipient is told about at most
// 3 requests from the same sender within an hour; any more arrive silently and
// wait in the section Přátelé. #228 sends the notification by this rule.
export const FRIEND_REQUEST_NOTIFY_LIMIT = 3;
export const FRIEND_REQUEST_NOTIFY_WINDOW_MS = 60 * 60 * 1000;

/** Since when earlier requests count towards the limit of a request made `now`. */
export function friendRequestNotifyWindowStart(now: Date): Date {
  return new Date(now.getTime() - FRIEND_REQUEST_NOTIFY_WINDOW_MS);
}

/**
 * Whether the recipient is told about a new request, from how many requests
 * the same sender made to them within the hour before it (whatever became of
 * them: withdrawn ones count too, or withdrawing would get round the limit).
 */
export function isFriendRequestNotified(earlierInWindow: number): boolean {
  return earlierInWindow < FRIEND_REQUEST_NOTIFY_LIMIT;
}

export type FriendRequestViolation = 'SELF_REQUEST';

/** Rules of a new request that need no data from elsewhere. Never throws. */
export function friendRequestViolations(
  senderId: string,
  recipientId: string,
): FriendRequestViolation[] {
  return senderId === recipientId ? ['SELF_REQUEST'] : [];
}
