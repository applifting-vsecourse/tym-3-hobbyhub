// #238: what every list in the administration shares. Newest first, a fixed
// page size; the text search is a plain case-insensitive "contains".
export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_SEARCH_MAX_LENGTH = 100;

// `filter` is a list's own smart filter (#271): which values it takes is the
// list's business, the others ignore it.
export type AdminListQuery<F extends string = string> = {
  search?: string;
  offset: number;
  filter?: F;
};

export const ADMIN_USER_FILTERS = [
  'blocked',
  'restricted',
  'unverified',
] as const;
export type AdminUserFilter = (typeof ADMIN_USER_FILTERS)[number];

export const ADMIN_EVENT_FILTERS = [
  'DRAFT',
  'PUBLISHED',
  'CANCELLED',
  'FINISHED',
  'NOT_HELD',
  'hidden',
] as const;
export type AdminEventFilter = (typeof ADMIN_EVENT_FILTERS)[number];

export type AdminPage<T> = { items: T[]; total: number };
