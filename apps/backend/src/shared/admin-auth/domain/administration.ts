// #238: what every list in the administration shares. Newest first, a fixed
// page size; the text search is a plain case-insensitive "contains".
export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_SEARCH_MAX_LENGTH = 100;

export type AdminListQuery = { search?: string; offset: number };

export type AdminPage<T> = { items: T[]; total: number };
