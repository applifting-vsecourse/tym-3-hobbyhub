import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/hobbyhub/Logo"

// The full logo is too wide for a phone header, so phones get the wordmark.
export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Logo
        variant="wordmark"
        className="h-7 sm:hidden"
      />
      <Logo
        variant="main"
        className="hidden h-7 sm:block"
      />
    </Link>
  )
}
