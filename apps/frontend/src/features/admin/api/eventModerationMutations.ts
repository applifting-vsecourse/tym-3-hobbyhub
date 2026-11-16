import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HTTPError } from "ky"

import { adminKeys } from "@/features/admin/api/adminKeys"
import {
  adminEventDetailSchema,
  eventModerationRefusalSchema,
  type AdminEventDetail,
  type EventModerationViolation,
} from "@/features/admin/api/adminSchemas"
import { adminApi } from "@/features/admin/lib/admin-api"

/** The server refused for a reason the page can explain, e.g. another administrator was faster. */
export class EventModerationRefusedError extends Error {
  constructor(readonly violations: EventModerationViolation[]) {
    super(violations.join(", "))
    this.name = "EventModerationRefusedError"
  }
}

async function withRefusal(send: () => Promise<unknown>): Promise<AdminEventDetail> {
  try {
    return adminEventDetailSchema.parse(await send())
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 400) {
      // ky has already read the body into `error.data`.
      const refusal = eventModerationRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new EventModerationRefusedError(refusal.data.violations)
    }
    throw error
  }
}

/** #239: hiding or bringing back an event changes its detail and every event list. */
function useEventModeration<TInput>(eventId: string, send: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => withRefusal(() => send(input)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.event(eventId) }),
        // Every page of every search of the list, and the users' event lists.
        queryClient.invalidateQueries({ queryKey: [...adminKeys.all(), "events"] }),
        queryClient.invalidateQueries({ queryKey: [...adminKeys.all(), "user"] }),
      ]),
  })
}

export const useHideEvent = (eventId: string) =>
  useEventModeration(eventId, (input: { reason: string }) =>
    adminApi.post(`events/${eventId}/hide`, { json: input }).json(),
  )

export const useRestoreEvent = (eventId: string) =>
  useEventModeration(eventId, () => adminApi.post(`events/${eventId}/restore`).json())
