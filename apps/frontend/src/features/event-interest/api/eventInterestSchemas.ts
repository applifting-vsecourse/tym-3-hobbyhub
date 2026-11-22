import { z } from "zod"

/** Why saving the event is refused now (#231). Removing never is. */
export const interestRuleViolationSchema = z.enum([
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "IS_ORGANIZER",
])

/** The signed-in person's own state on an event; nothing about anyone else. */
export const eventInterestStateSchema = z.object({
  isSaved: z.boolean(),
  /** Empty when the event may be saved now. */
  violations: z.array(interestRuleViolationSchema),
})

export type EventInterestState = z.infer<typeof eventInterestStateSchema>
