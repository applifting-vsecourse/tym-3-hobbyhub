import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/hobbyhub/Logo"

// One wordmark at every width, as in the Figma header (mobile and desktop).
export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Logo
        variant="wordmark"
        className="h-7"
      />
    </Link>
  )
}
