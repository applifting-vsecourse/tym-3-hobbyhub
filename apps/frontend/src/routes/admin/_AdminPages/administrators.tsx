import { createFileRoute } from "@tanstack/react-router"

import { Administrators } from "@/features/admin/components/Administrators"

export const Route = createFileRoute("/admin/_AdminPages/administrators")({
  component: Administrators,
})
