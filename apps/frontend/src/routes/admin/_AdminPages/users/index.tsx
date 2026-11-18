import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { AdminUsers } from "@/features/admin/components/AdminUsers"
import { adminUsersSearchSchema, toAdminListSearch } from "@/features/admin/lib/listSearch"

export const Route = createFileRoute("/admin/_AdminPages/users/")({
  validateSearch: adminUsersSearchSchema,
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
    <AdminUsers
      search={q ?? ""}
      offset={offset ?? 0}
      filter={filter}
      onChange={onChange}
      onFilterChange={onFilterChange}
    />
  )
}
