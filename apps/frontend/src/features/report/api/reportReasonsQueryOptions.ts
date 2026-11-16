import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { reportKeys } from "@/features/report/api/reportKeys"
import { reportReasonsSchema } from "@/features/report/api/reportSchemas"

export const reportReasonsQueryOptions = () =>
  queryOptions({
    queryKey: reportKeys.reasons(),
    queryFn: async () => reportReasonsSchema.parse(await api.get("report-reasons").json()),
    // Lookup data: changes with a deploy.
    staleTime: 60 * 60 * 1000,
  })
