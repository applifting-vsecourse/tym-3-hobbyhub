import type { ReactNode } from "react"

import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import { cn } from "@/lib/utils"

type YourSeatProps = {
  title?: string
  description: string
  /** The main action lives inside the seat, not under it: <Button>Obsadit místo</Button>. */
  action: ReactNode
  /** `dark` drops the dashed outline when the seat sits on the signal surface. */
  surface?: "light" | "dark"
  className?: string
}

/** Tvoje místo — the free seat that invites the visitor to take it. */
export function YourSeat({
  title = "Tvoje místo?",
  description,
  action,
  surface = "light",
  className,
}: YourSeatProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-lg bg-accent p-4",
        surface === "light" && "border border-dashed border-primary",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <ActivityAvatar avatar="free" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-accent-foreground">
          <p className="typo-title">{title}</p>
          <p className="typo-small">{description}</p>
        </div>
      </div>
      <div className="*:w-full">{action}</div>
    </div>
  )
}
