import { useQuery } from "@tanstack/react-query"

import { reportReasonsQueryOptions } from "@/features/report/api/reportReasonsQueryOptions"

/** Loaded once the report sheet is wanted, not with every page that offers it. */
export function useReportReasons(isEnabled: boolean) {
  return useQuery({ ...reportReasonsQueryOptions(), enabled: isEnabled })
}
