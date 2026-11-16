import { z } from "zod"

import {
  FILTER_TEXT_MAX_LENGTH,
  isNumberRangeReversed,
  isRangeValueValid,
} from "@/components/hobbyhub/FiltersSheet"

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

// A number within what the server takes (see `RANGE_LIMITS`); anything else in a
// hand-written link is dropped. It stays a number, so the address reads
// `priceTo=200` and not `priceTo="200"`.
const amount = (kind: "price" | "duration" | "capacity") =>
  z
    .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)])
    .refine((value) => isRangeValueValid(kind, value))
    .transform(Number)
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

/**
 * The address of the public list: the filters "Moje akce" shares, and the
 * ranges only the public list offers (#214).
 */
export const eventsListSearchSchema = eventsSearchSchema.extend({
  free: z
    .union([z.boolean(), z.literal("true")])
    .transform((value) => value === true || value === "true")
    .optional()
    .catch(undefined),
  priceFrom: amount("price"),
  priceTo: amount("price"),
  hoursFrom: amount("duration"),
  hoursTo: amount("duration"),
  capacityFrom: amount("capacity"),
  capacityTo: amount("capacity"),
})

type ListRangesSearch = Partial<
  Pick<
    z.infer<typeof eventsListSearchSchema>,
    "free" | "priceFrom" | "priceTo" | "hoursFrom" | "hoursTo" | "capacityFrom" | "capacityTo"
  >
>

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
  /** Only events with a free seat (#214). */
  freeSpotsOnly: boolean
  /** Ranges as typed; empty means no bound. Price in CZK, duration in hours. */
  priceFrom: string
  priceTo: string
  hoursFrom: string
  hoursTo: string
  capacityFrom: string
  capacityTo: string
}

/** A change of the filters behind the panel and the chips; the search text goes its own way. */
export type EventFilterChange = Partial<Omit<EventFilterValues, "search">>

const rangeText = (value?: number): string => (value === undefined ? "" : String(value))

/**
 * What the address asks for. A range that ends before it starts (a
 * hand-written link) is not asked of the server; the page says why.
 */
export function filtersFromSearch({
  activity,
  q,
  location,
  from,
  to,
  free: isFree,
  priceFrom,
  priceTo,
  hoursFrom,
  hoursTo,
  capacityFrom,
  capacityTo,
}: EventsSearch & ListRangesSearch): {
  filters: EventFilterValues
  isRangeReversed: boolean
} {
  const isDateReversed = from !== undefined && to !== undefined && from > to
  const isPriceReversed = isNumberRangeReversed(priceFrom, priceTo)
  const isHoursReversed = isNumberRangeReversed(hoursFrom, hoursTo)
  const isCapacityReversed = isNumberRangeReversed(capacityFrom, capacityTo)
  return {
    filters: {
      activityIds: activity ?? [],
      search: q ?? "",
      location: location ?? "",
      dateFrom: isDateReversed ? "" : (from ?? ""),
      dateTo: isDateReversed ? "" : (to ?? ""),
      freeSpotsOnly: isFree ?? false,
      priceFrom: isPriceReversed ? "" : rangeText(priceFrom),
      priceTo: isPriceReversed ? "" : rangeText(priceTo),
      hoursFrom: isHoursReversed ? "" : rangeText(hoursFrom),
      hoursTo: isHoursReversed ? "" : rangeText(hoursTo),
      capacityFrom: isCapacityReversed ? "" : rangeText(capacityFrom),
      capacityTo: isCapacityReversed ? "" : rangeText(capacityTo),
    },
    isRangeReversed: isDateReversed || isPriceReversed || isHoursReversed || isCapacityReversed,
  }
}

/** A range end as the address holds it: a number, or nothing when emptied. */
const rangeNumber = (value: string): number | undefined => {
  const trimmed = nonEmpty(value)
  return trimmed === undefined ? undefined : Number(trimmed)
}

/** The address after a change of some filters. The rest of it (a tab, say) stays. */
export function searchWithFilters<T extends EventsSearch & ListRangesSearch>(
  previous: T,
  next: EventFilterChange,
): T {
  return {
    ...previous,
    ...(next.activityIds && {
      activity: next.activityIds.length > 0 ? next.activityIds : undefined,
    }),
    ...(next.location !== undefined && { location: nonEmpty(next.location) }),
    ...(next.dateFrom !== undefined && { from: nonEmpty(next.dateFrom) }),
    ...(next.dateTo !== undefined && { to: nonEmpty(next.dateTo) }),
    ...(next.freeSpotsOnly !== undefined && { free: next.freeSpotsOnly ? true : undefined }),
    ...(next.priceFrom !== undefined && { priceFrom: rangeNumber(next.priceFrom) }),
    ...(next.priceTo !== undefined && { priceTo: rangeNumber(next.priceTo) }),
    ...(next.hoursFrom !== undefined && { hoursFrom: rangeNumber(next.hoursFrom) }),
    ...(next.hoursTo !== undefined && { hoursTo: rangeNumber(next.hoursTo) }),
    ...(next.capacityFrom !== undefined && { capacityFrom: rangeNumber(next.capacityFrom) }),
    ...(next.capacityTo !== undefined && { capacityTo: rangeNumber(next.capacityTo) }),
  }
}

/** Some filter is on, so an empty list means "nothing matches", not "nothing yet". */
export const hasFilters = (filters: EventFilterValues): boolean =>
  filters.activityIds.length > 0 ||
  filters.search !== "" ||
  filters.location !== "" ||
  filters.dateFrom !== "" ||
  filters.dateTo !== "" ||
  filters.freeSpotsOnly ||
  filters.priceFrom !== "" ||
  filters.priceTo !== "" ||
  filters.hoursFrom !== "" ||
  filters.hoursTo !== "" ||
  filters.capacityFrom !== "" ||
  filters.capacityTo !== ""
