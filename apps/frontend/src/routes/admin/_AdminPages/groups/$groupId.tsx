import { createFileRoute } from "@tanstack/react-router"

import { AdminGroupDetail } from "@/features/admin/components/AdminGroupDetail"

export const Route = createFileRoute("/admin/_AdminPages/groups/$groupId")({
  component: Page,
})

function Page() {
  const { groupId } = Route.useParams()
  return <AdminGroupDetail groupId={groupId} />
}
