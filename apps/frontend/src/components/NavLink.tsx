import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type { NavTarget } from "@/lib/navigation"

type NavLinkProps = {
  target: NavTarget
  /** Decided by `navSectionForPath`, not by the router's own prefix match. */
  isActive: boolean
  className?: string
  "aria-label"?: string
  children: ReactNode
}

/**
 * A main-navigation link. Anything that changes the route is a link, so the
 * items of both navigations render through this, including the one page the
 * router does not know yet (a plain `href`).
 */
export function NavLink({ target, isActive, children, ...rest }: NavLinkProps) {
  const shared = { ...rest, "aria-current": isActive ? ("page" as const) : undefined }

  if ("href" in target) {
    return (
      <a
        href={target.href}
        {...shared}
      >
        {children}
      </a>
    )
  }

  // Exact only: the router adds its own aria-current when the paths match
  // exactly, which agrees with `isActive`; on sub-pages ours above applies.
  return (
    <Link
      to={target.to}
      activeOptions={{ exact: true }}
      {...shared}
    >
      {children}
    </Link>
  )
}
