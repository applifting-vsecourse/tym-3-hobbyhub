import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { cancellationReasonsSchema } from "@/features/event/api/eventSchemas"

export const cancellationReasonsQueryOptions = () =>
  queryOptions({
    queryKey: eventKeys.cancellationReasons(),
    queryFn: async () =>
      cancellationReasonsSchema.parse(await api.get("cancellation-reasons").json()),
    // Lookup data: changes with a deploy.
    staleTime: 60 * 60 * 1000,
  })
