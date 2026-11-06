import { z } from "zod"

import { FILTER_TEXT_MAX_LENGTH } from "@/components/hobbyhub/FiltersSheet"

/** The server refuses longer texts, so the address and the fields cut them. */
export const EVENT_SEARCH_MAX_LENGTH = FILTER_TEXT_MAX_LENGTH

const text = z.coerce
  .string()
  .transform((value) => value.slice(0, EVENT_SEARCH_MAX_LENGTH))
  .optional()
  .catch(undefined)

// The filters of the event list as they sit in the address. A hand-written or
// shared link may hold a single value or a number where the app writes a list
// or a text, so both are accepted instead of silently dropped.
// A day as the server takes it; anything else in a hand-written link is dropped.
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, date] = value.split("-").map(Number)
    const parsed = new Date(Date.UTC(year!, month! - 1, date))
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month! - 1
  })
  .optional()
  .catch(undefined)

export const eventsSearchSchema = z.object({
  activity: z
    .union([z.array(z.coerce.string()), z.coerce.string().transform((id) => [id])])
    .optional()
    .catch(undefined),
  q: text,
  location: text,
  from: day,
  to: day,
})

/** An empty text is no filter, and keeps the address clean. */
export const nonEmpty = (value = "") => (value.trim() === "" ? undefined : value.trim())

export type EventsSearch = z.infer<typeof eventsSearchSchema>

/** The filters of an event listing as the page holds them: empty text is no filter. */
export type EventFilterValues = {
  activityIds: string[]
  search: string
  location: string
  dateFrom: string
  dateTo: string
}

/** A change of the filters behind the panel and the chips; the search text goes its own way. */
export type EventFilterChange = Partial<Omit<EventFilterValues, "search">>

/**
 * What the address asks for. A range that ends before it starts (a
 * hand-written link) is not asked of the server; the page says why.
 */
export function filtersFromSearch({ activity, q, location, from, to }: EventsSearch): {
  filters: EventFilterValues
  isRangeReversed: boolean
} {
  const isRangeReversed = from !== undefined && to !== undefined && from > to
  return {
    filters: {
      activityIds: activity ?? [],
      search: q ?? "",
      location: location ?? "",
      dateFrom: isRangeReversed ? "" : (from ?? ""),
      dateTo: isRangeReversed ? "" : (to ?? ""),
    },
    isRangeReversed,
  }
}

/** The address after a change of some filters. The rest of it (a tab, say) stays. */
export function searchWithFilters<T extends EventsSearch>(previous: T, next: EventFilterChange): T {
  return {
    ...previous,
    ...(next.activityIds && {
      activity: next.activityIds.length > 0 ? next.activityIds : undefined,
    }),
    ...(next.location !== undefined && { location: nonEmpty(next.location) }),
    ...(next.dateFrom !== undefined && { from: nonEmpty(next.dateFrom) }),
    ...(next.dateTo !== undefined && { to: nonEmpty(next.dateTo) }),
  }
}

/** Some filter is on, so an empty list means "nothing matches", not "nothing yet". */
export const hasFilters = (filters: EventFilterValues): boolean =>
  filters.activityIds.length > 0 ||
  filters.search !== "" ||
  filters.location !== "" ||
  filters.dateFrom !== "" ||
  filters.dateTo !== ""
