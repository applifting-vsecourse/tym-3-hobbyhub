import type { ReactNode } from "react"

import { NavLink } from "@/components/NavLink"
import type { NavTarget } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type HeaderNavLinkProps = {
  target: NavTarget
  isActive: boolean
  children: ReactNode
  className?: string
}

export function HeaderNavLink({ target, isActive, children, className }: HeaderNavLinkProps) {
  return (
    <NavLink
      target={target}
      isActive={isActive}
      className={cn(
        "rounded-md px-2 py-1 typo-label whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </NavLink>
  )
}
