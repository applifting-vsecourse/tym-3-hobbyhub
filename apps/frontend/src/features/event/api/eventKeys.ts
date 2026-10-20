export type EventListFilters = {
  /** Activity ids; none means every activity. */
  activityIds: string[]
  /** Part of the title, place or activity; empty means no search. */
  search: string
  /** Part of the place, city or district; empty means anywhere. */
  location: string
}

export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  list: (filters: EventListFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all(), "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
}
