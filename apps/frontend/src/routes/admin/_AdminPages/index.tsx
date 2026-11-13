import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

export const Route = createFileRoute("/admin/_AdminPages/")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.adminUsers })
  },
})
