import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { levelKeys } from "@/features/level/api/levelKeys"
import { levelsSchema } from "@/features/level/api/levelSchemas"

export const levelsQueryOptions = () =>
  queryOptions({
    queryKey: levelKeys.lists(),
    queryFn: async () => levelsSchema.parse(await api.get("levels").json()),
    // Lookup data: changes with a deploy, not while someone fills in a form.
    staleTime: 60 * 60 * 1000,
  })
