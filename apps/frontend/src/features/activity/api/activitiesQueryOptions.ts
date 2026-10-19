import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { activityKeys } from "@/features/activity/api/activityKeys"
import { activitiesSchema } from "@/features/activity/api/activitySchemas"

export const activitiesQueryOptions = () =>
  queryOptions({
    queryKey: activityKeys.lists(),
    queryFn: async () => activitiesSchema.parse(await api.get("activities").json()),
    // Lookup data: changes with a deploy, not while someone fills in a form.
    staleTime: 60 * 60 * 1000,
  })
