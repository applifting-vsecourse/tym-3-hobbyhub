import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { AdminEvents } from "@/features/admin/components/AdminEvents"
import { adminEventsSearchSchema, toAdminListSearch } from "@/features/admin/lib/listSearch"

export const Route = createFileRoute("/admin/_AdminPages/events/")({
  validateSearch: adminEventsSearchSchema,
  component: Page,
})

function Page() {
  const { q, offset, filter } = Route.useSearch()
  const navigate = Route.useNavigate()
  const onChange = useCallback(
    (next: { search: string; offset: number }) =>
      void navigate({ search: { ...toAdminListSearch(next), filter } }),
    [navigate, filter],
  )
  // A new filter starts at the first page and keeps the search.
  const onFilterChange = useCallback(
    (next: typeof filter) => void navigate({ search: { q, filter: next } }),
    [navigate, q],
  )

  return (
    <AdminEvents
      search={q ?? ""}
      offset={offset ?? 0}
      filter={filter}
      onChange={onChange}
      onFilterChange={onFilterChange}
    />
  )
}
