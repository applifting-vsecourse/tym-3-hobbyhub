import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type { NavRoute } from "@/lib/navigation"

type NavLinkProps = {
  to: NavRoute
  /** Decided by `navSectionForPath`, not by the router's own prefix match. */
  isActive: boolean
  className?: string
  "aria-label"?: string
  children: ReactNode
}

/**
 * A main-navigation link. Anything that changes the route is a link, so the
 * items of both navigations render through this.
 */
export function NavLink({ to, isActive, children, ...rest }: NavLinkProps) {
  // Exact only: the router adds its own aria-current when the paths match
  // exactly, which agrees with `isActive`; on sub-pages ours applies.
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      {...rest}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  )
}
