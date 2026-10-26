/** The visitor's position, rounded, so a small move does not refetch. */
export type NearPoint = { latitude: number; longitude: number }

export type EventListFilters = {
  /** Activity ids; none means every activity. */
  activityIds: string[]
  /** Part of the title, place or activity; empty means no search. */
  search: string
  /** Part of the place, city or district; empty means anywhere. */
  location: string
  /** Sort nearest first from here; otherwise soonest first. */
  near?: NearPoint
}

export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  list: (filters: EventListFilters) => [...eventKeys.lists(), filters] as const,
  // Every event with a place, for the map: all pages of one filter.
  map: (filters: EventListFilters) => [...eventKeys.lists(), "map", filters] as const,
  // The few soonest events on the landing page.
  upcoming: (limit: number) => [...eventKeys.lists(), "upcoming", limit] as const,
  // Public detail (F-02.4).
  publicDetails: () => [...eventKeys.all(), "public-detail"] as const,
  publicDetail: (id: string) => [...eventKeys.publicDetails(), id] as const,
  // The organizer's full view (F-05.10).
  managed: (id: string) => [...eventKeys.all(), "managed", id] as const,
  cancellationReasons: () => ["cancellation-reasons"] as const,
}
