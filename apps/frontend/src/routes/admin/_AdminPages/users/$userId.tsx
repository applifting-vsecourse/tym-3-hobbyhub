import { createFileRoute } from "@tanstack/react-router"

import { AdminUserDetail } from "@/features/admin/components/AdminUserDetail"

export const Route = createFileRoute("/admin/_AdminPages/users/$userId")({
  component: Page,
})

function Page() {
  const { userId } = Route.useParams()
  return <AdminUserDetail userId={userId} />
}
