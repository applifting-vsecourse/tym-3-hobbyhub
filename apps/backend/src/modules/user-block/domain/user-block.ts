// #239, ADR-0022: an administrator blocks two people from each other. Plain
// TypeScript: the vocabulary of the module, its limits and its rules.

export const USER_BLOCK_REASON_MIN_LENGTH = 10;
export const USER_BLOCK_REASON_MAX_LENGTH = 500;

/** One block of a person, as the administration lists it on their detail. */
export type AdminUserBlock = {
  // The other person of the pair.
  otherUser: { id: string; name: string };
  reason: string;
  createdAt: Date;
  // Null only if the administrator's account was removed from the database.
  createdBy: { id: string; name: string } | null;
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
