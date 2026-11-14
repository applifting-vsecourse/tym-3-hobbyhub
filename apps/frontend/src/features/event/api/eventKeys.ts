import type { GroupEventPeriod } from "@/features/event/api/eventSchemas"

/** The visitor's position, rounded, so a small move does not refetch. */
export type NearPoint = { latitude: number; longitude: number }

export type EventListFilters = {
  /** Activity ids; none means every activity. */
  activityIds: string[]
  /** Part of the title, place or activity; empty means no search. */
  search: string
  /** Part of the place, city or district; empty means anywhere. */
  location: string
  /** First day (YYYY-MM-DD) an event starts on; empty means no lower bound. */
  dateFrom?: string
  /** Last day (YYYY-MM-DD) an event starts on; empty means no upper bound. */
  dateTo?: string
  /** Only events that still have a free seat (#214). */
  freeSpotsOnly?: boolean
  /** Contribution per seat in CZK, inclusive; empty means no bound (#214). */
  priceFrom?: string
  priceTo?: string
  /** Hours from start to end, inclusive; empty means no bound. */
  hoursFrom?: string
  hoursTo?: string
  /** How many people the event holds, inclusive; empty means no bound. */
  capacityFrom?: string
  capacityTo?: string
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
  // Detail (F-02.4). Keyed by viewer too: a group-only event (F-07.2) shows to
  // its group's members only, so signing out must not leave it in the cache.
  details: () => [...eventKeys.all(), "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  detailFor: (id: string, viewerId: string | null) => [...eventKeys.detail(id), viewerId] as const,
  // F-07.2: the events of a group on its page. Members get the group-only and
  // past ones too, so whether the viewer is one is part of the key.
  groupEvents: (
    groupId: string,
    period: GroupEventPeriod,
    viewerId: string | null,
    isMember: boolean,
  ) => [...eventKeys.all(), "group", groupId, period, viewerId, isMember] as const,
  // The exact address and contacts of one person's seat (F-06.5): keyed by
  // user, so a switch of account never shows the previous one's data.
  participantInfo: (id: string, userId: string) =>
    [...eventKeys.all(), "participant-info", id, userId] as const,
  // The organizer's full view (F-05.10).
  managed: (id: string) => [...eventKeys.all(), "managed", id] as const,
  cancellationReasons: () => ["cancellation-reasons"] as const,
}
