import { createFileRoute } from "@tanstack/react-router"

import { AdminAttention } from "@/features/admin/components/AdminAttention"

export const Route = createFileRoute("/admin/_AdminPages/attention")({
  component: AdminAttention,
})
