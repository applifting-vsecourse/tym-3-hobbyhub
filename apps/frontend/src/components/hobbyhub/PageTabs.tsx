import type { ComponentPropsWithRef, ReactNode } from "react"
import { createLink, type LinkComponent } from "@tanstack/react-router"

import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

type PageTabAnchorProps = ComponentPropsWithRef<"a"> & {
  /** The tab on screen. The page says which, not the router: it also reads the search. */
  isActive: boolean
}

// The router marks a link active by its own partial match of the search, which
// calls every tab without a param "current" — so the page decides, last.
function PageTabAnchor({ isActive, className, children, ...props }: PageTabAnchorProps) {
  return (
    <a
      {...props}
      aria-current={isActive ? "page" : undefined}
      data-state={isActive ? "on" : "off"}
      className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9", className)}
    >
      {children}
    </a>
  )
}

const PageTabLink = createLink(PageTabAnchor)

/**
 * One tab of `PageTabs`: a link, because the tab lives in the URL
 * (`/groups?tab=discover`, `/my-events?tab=hosted`), drawn as the kit's filter chip.
 */
export const PageTab: LinkComponent<typeof PageTabAnchor> = (props) => <PageTabLink {...props} />

/** Tabs of a page kept in the URL, so a link or a redirect can open a given one. */
export function PageTabs({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {children}
    </nav>
  )
}
