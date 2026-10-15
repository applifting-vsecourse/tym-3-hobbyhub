import type { ReactNode } from "react"

import { ActivityAvatar, type AvatarKind } from "@/components/hobbyhub/ActivityAvatar"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { cn } from "@/lib/utils"

type RosterRowProps =
  | {
      kind: "person" | "pending"
      name: string
      /** "Organizátor", "Žádost odeslána"… */
      note: string
      avatar: AvatarKind
      action?: ReactNode
      className?: string
    }
  | {
      kind: "free"
      name?: string
      note?: string
      avatar?: never
      /** Usually an outline S button "Sdílet do chatu". */
      action?: ReactNode
      className?: string
    }

/**
 * Řádek soupisky — a person, a pending request or a free seat. Only the
 * avatar circle is dashed for a free seat, never the whole row.
 */
export function RosterRow(props: RosterRowProps) {
  const { kind, action, className } = props
  const isFree = kind === "free"

  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md border border-border px-3 py-2",
        !isFree && "bg-card",
        className,
      )}
    >
      <ActivityAvatar avatar={isFree ? "free" : props.avatar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className={cn("truncate typo-label", isFree ? "text-signal-ink" : "text-foreground")}>
          {props.name ?? "Volné místo"}
        </p>
        <p className="truncate typo-small text-muted-foreground">
          {props.note ?? "Chybí do minima"}
        </p>
      </div>
      {kind === "pending" ? <StatusBadge status="pending" /> : null}
      {action}
    </div>
  )
}
