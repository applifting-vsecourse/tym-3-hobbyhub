import { Activity } from '@/modules/activity/domain/activity';

export const GROUP_NAME_MIN_LENGTH = 3;
export const GROUP_NAME_MAX_LENGTH = 80;
export const GROUP_DESCRIPTION_MAX_LENGTH = 2000;
export const GROUP_LOCATION_MAX_LENGTH = 100;
export const GROUP_SCHEDULE_MAX_LENGTH = 100;

export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER';

// The founder (OWNER) is a superset of an ADMIN: anything an admin may do in a
// group, the owner may too. Use this for every admin check, never
// `role === 'ADMIN'`, or the founder loses rights they have.
export const hasGroupAdminRights = (role: GroupRole): boolean =>
  role === 'OWNER' || role === 'ADMIN';

// The roles an owner hands out (ADR-0007); OWNER moves only by a transfer.
export const ASSIGNABLE_GROUP_ROLES = ['ADMIN', 'MEMBER'] as const;
export type AssignableGroupRole = (typeof ASSIGNABLE_GROUP_ROLES)[number];

// F-07.3b: what one member does to another in member management.
export type MemberAction =
  | { kind: 'remove' }
  | { kind: 'setRole'; role: AssignableGroupRole }
  | { kind: 'transferOwnership' };

export type MemberActionViolation =
  // Leaving goes through DELETE /membership, not member management.
  'ACTING_ON_SELF' | 'NOT_ALLOWED';

// ADR-0007: an admin removes MEMBERs; only the owner names, demotes or
// removes admins and hands the group over; nobody touches the owner.
const isAllowed = (
  actorRole: GroupRole,
  targetRole: GroupRole,
  action: MemberAction,
): boolean => {
  if (targetRole === 'OWNER') return false;
  switch (action.kind) {
    case 'remove':
      return targetRole === 'MEMBER'
        ? hasGroupAdminRights(actorRole)
        : actorRole === 'OWNER';
    case 'setRole':
    case 'transferOwnership':
      return actorRole === 'OWNER';
  }
};

export const memberActionViolations = (
  actor: { userId: string; role: GroupRole },
  target: { userId: string; role: GroupRole },
  action: MemberAction,
): MemberActionViolation[] => {
  if (actor.userId === target.userId) return ['ACTING_ON_SELF'];
  return isAllowed(actor.role, target.role, action) ? [] : ['NOT_ALLOWED'];
};

export type GroupVisibility = 'PUBLIC' | 'PRIVATE';
export type GroupStatus = 'ACTIVE' | 'CANCELLED';

export type Group = {
  id: string;
  name: string;
  description: string;
  locationName: string | null;
  usualSchedule: string | null;
  visibility: GroupVisibility;
  status: GroupStatus;
  createdAt: Date;
  activity: Activity;
  memberCount: number;
};

// F-02.5: who may see a group's public page. Anything else is shown as "not
// found" (or left out of an event), so nobody can tell it exists.
export const isPubliclyVisible = (
  group: Pick<Group, 'visibility' | 'status'>,
): boolean => group.visibility === 'PUBLIC' && group.status === 'ACTIVE';

export type CreateGroupData = {
  name: string;
  activityId: string;
  description: string;
  locationName?: string;
  usualSchedule?: string;
};

// F-07.3: a member as the group's admins see them in member management.
export type GroupMember = {
  userId: string;
  name: string;
  image: string | null;
  role: GroupRole;
  joinedAt: Date;
};

// How a hand-over ended when the roles changed between the check and the
// write: the actor was no longer the owner, or the new owner had left.
export type TransferOwnershipResult =
  'TRANSFERRED' | 'NOT_OWNER' | 'TARGET_NOT_MEMBER';

// A group seen by one of its members (F-07.8 "Moje skupiny").
export type MyGroup = Group & { myRole: GroupRole };

export const NEARBY_GROUPS_LIMIT = 6;
export const DISCOVER_PAGE_SIZE = 20;

export type NearbyGroups = {
  // The place the search used; null when the user has not set one.
  city: string | null;
  groups: Group[];
};

export type GroupPage = {
  items: Group[];
  nextCursor: string | null;
};
