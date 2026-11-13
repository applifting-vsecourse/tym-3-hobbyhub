import { createFileRoute } from "@tanstack/react-router"

import { AdminEventDetail } from "@/features/admin/components/AdminEventDetail"

export const Route = createFileRoute("/admin/_AdminPages/events/$eventId")({
  component: Page,
})

function Page() {
  const { eventId } = Route.useParams()
  return <AdminEventDetail eventId={eventId} />
}
