import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { participantInfoSchema } from "@/features/event/api/eventSchemas"

/** Only for the organizer and approved participants: anyone else gets a 403. */
export const participantInfoQueryOptions = (eventId: string, userId: string) =>
  queryOptions({
    queryKey: eventKeys.participantInfo(eventId, userId),
    queryFn: async () =>
      participantInfoSchema.parse(await api.get(`events/${eventId}/participant-info`).json()),
  })
