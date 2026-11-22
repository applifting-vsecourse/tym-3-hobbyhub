import { z } from "zod"

/** Why saving the event is refused now (#231). Removing never is. */
export const interestRuleViolationSchema = z.enum([
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "IS_ORGANIZER",
])

/**
 * Why watching the event for a free seat is refused now (#232). EVENT_NOT_FULL:
 * there is a seat to take. The rest: the person could not ask to join anyway.
 * Stopping never is.
 */
export const watchRuleViolationSchema = z.enum([
  "EVENT_NOT_FULL",
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "IS_ORGANIZER",
  "HAS_SEAT",
  "ALREADY_REQUESTED",
  "REJECTED_BEFORE",
])

export type WatchRuleViolation = z.infer<typeof watchRuleViolationSchema>

/** The signed-in person's own state on an event; nothing about anyone else. */
export const eventInterestStateSchema = z.object({
  isSaved: z.boolean(),
  /** Empty when the event may be saved now. */
  violations: z.array(interestRuleViolationSchema),
  /** #232: they watch the event for a free seat; only ever a saved one. */
  isWatching: z.boolean(),
  /** Empty when they may start watching now. */
  watchViolations: z.array(watchRuleViolationSchema),
})

/** A refused start of watching: the codes say why. */
export const watchRefusalSchema = z.object({ violations: z.array(watchRuleViolationSchema) })

export type EventInterestState = z.infer<typeof eventInterestStateSchema>
