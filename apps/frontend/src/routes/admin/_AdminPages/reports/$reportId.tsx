import { createFileRoute } from "@tanstack/react-router"

import { AdminReportDetail } from "@/features/admin/components/AdminReportDetail"

export const Route = createFileRoute("/admin/_AdminPages/reports/$reportId")({
  component: Page,
})

function Page() {
  const { reportId } = Route.useParams()
  return <AdminReportDetail reportId={reportId} />
}
