import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { myEventsSchema } from "@/features/event/api/myEventsSchemas"

export const myEventsKeys = {
  all: () => ["my-events"] as const,
  // Per user, so the next person signing in on this device never sees the
  // overview of the one before.
  overview: (userId: string) => [...myEventsKeys.all(), userId] as const,
}

export const myEventsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: myEventsKeys.overview(userId),
    // Requests are sent and decided on other pages; the overview always reloads.
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => myEventsSchema.parse(await api.get("my-events").json()),
  })
