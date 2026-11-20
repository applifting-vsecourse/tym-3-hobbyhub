// #239, ADR-0022: an administrator blocks two people from each other. #65,
// ADR-0028: a user blocks another user, one way. Plain TypeScript: the
// vocabulary of the module, its limits and its rules.

export const USER_BLOCK_REASON_MIN_LENGTH = 10;
export const USER_BLOCK_REASON_MAX_LENGTH = 500;

// Who made a block: an administrator (both ways) or the blocker (one way).
export const USER_BLOCK_SOURCES = ['ADMINISTRATOR', 'USER'] as const;
export type UserBlockSource = (typeof USER_BLOCK_SOURCES)[number];

/** One block of a person, as the administration lists it on their detail. */
export type AdminUserBlock = {
  source: UserBlockSource;
  // The other person of the pair.
  otherUser: { id: string; name: string };
  // A user's block runs one way: true when the person whose detail this is
  // made it, false when the other one blocked them. An administrator's block
  // runs both ways, so it is always false there.
  isBlocker: boolean;
  // Set on every block by an administrator; a user gives none.
  reason: string | null;
  createdAt: Date;
  // Null for a user's block, or if the administrator's account was removed.
  createdBy: { id: string; name: string } | null;
};

/** #65: someone the user blocked, as they see it in their settings. */
export type BlockedUser = {
  id: string;
  name: string;
  image: string | null;
  blockedAt: Date;
};

export type UserBlockViolation =
  'SAME_USER' | 'ALREADY_BLOCKED' | 'NOT_BLOCKED';

// A block by an administrator applies both ways, so it is stored once, the
// smaller id as the blocker (CHECK user_block_admin_ordered in the migration).
export const orderedPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export const userBlockViolations = (
  userId: string,
  otherUserId: string,
): UserBlockViolation[] => (userId === otherUserId ? ['SAME_USER'] : []);

// #65, ADR-0028: whether any of the people who run something (the organizers
// of an event, the owner and admins of a group) is someone the person blocked.
// The blocked would never see the person's request, so it is not sent.
export const runByBlocked = (
  runnerIds: string[],
  blockedIds: string[],
): boolean => runnerIds.some((id) => blockedIds.includes(id));
