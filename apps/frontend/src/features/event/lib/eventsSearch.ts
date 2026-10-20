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
export const eventsSearchSchema = z.object({
  activity: z
    .union([z.array(z.coerce.string()), z.coerce.string().transform((id) => [id])])
    .optional()
    .catch(undefined),
  q: text,
  location: text,
})

/** An empty text is no filter, and keeps the address clean. */
export const nonEmpty = (value = "") => (value.trim() === "" ? undefined : value.trim())
