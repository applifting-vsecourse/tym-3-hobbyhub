// #227, ADR-0026: the vocabulary of friendships. Plain TypeScript: no Nest,
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
 * Review of #225: at most this many people per text, 5 pages. Without a cap a
 * two-letter text could be paged through to the end, listing every user;
 * beyond it the person narrows the nickname instead.
 */
export const FRIEND_SEARCH_MAX_RESULTS = 100;

/**
 * One person found by the search: only what the public profile shows (the
 * visibility matrix), never the e-mail. `name` is the nickname, the one name
 * a person has (ADR-0025).
 */
export type FriendSearchResult = {
  id: string;
  name: string;
  image: string | null;
  relation: FriendRelation;
};

export type FriendSearchPage = {
  items: FriendSearchResult[];
  /** Where the next page starts; null on the last one. */
  nextOffset: number | null;
  /**
   * More people match than may be paged through (`FRIEND_SEARCH_MAX_RESULTS`):
   * this is the last page shown, the person should narrow the nickname.
   */
  isCapped: boolean;
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
