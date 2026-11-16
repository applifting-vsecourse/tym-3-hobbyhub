import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { AdminUsers } from "@/features/admin/components/AdminUsers"
import { adminListSearchSchema, toAdminListSearch } from "@/features/admin/lib/listSearch"

export const Route = createFileRoute("/admin/_AdminPages/users/")({
  validateSearch: adminListSearchSchema,
  component: Page,
})

function Page() {
  const { q, offset } = Route.useSearch()
  const navigate = Route.useNavigate()
  const onChange = useCallback(
    (next: { search: string; offset: number }) =>
      void navigate({ search: toAdminListSearch(next) }),
    [navigate],
  )

  return (
    <AdminUsers
      search={q ?? ""}
      offset={offset ?? 0}
      onChange={onChange}
    />
  )
}
