import { Activity } from '@/modules/activity/domain/activity';

export const GROUP_NAME_MIN_LENGTH = 3;
export const GROUP_NAME_MAX_LENGTH = 80;
export const GROUP_DESCRIPTION_MAX_LENGTH = 2000;
export const GROUP_LOCATION_MAX_LENGTH = 100;
export const GROUP_SCHEDULE_MAX_LENGTH = 100;

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

export type CreateGroupData = {
  name: string;
  activityId: string;
  description: string;
  locationName?: string;
  usualSchedule?: string;
};

export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER';

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
