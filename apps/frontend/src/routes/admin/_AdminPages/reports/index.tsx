import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"

import type { AdminReportFilter } from "@/features/admin/api/reportSchemas"
import { AdminReports } from "@/features/admin/components/AdminReports"
import {
  reportSearchSchema,
  toReportFilter,
  toReportSearch,
} from "@/features/admin/lib/reportSearch"

export const Route = createFileRoute("/admin/_AdminPages/reports/")({
  validateSearch: reportSearchSchema,
  component: Page,
})

function Page() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onChange = useCallback(
    (next: AdminReportFilter) => void navigate({ search: toReportSearch(next) }),
    [navigate],
  )

  return (
    <AdminReports
      filter={toReportFilter(search)}
      onChange={onChange}
    />
  )
}
