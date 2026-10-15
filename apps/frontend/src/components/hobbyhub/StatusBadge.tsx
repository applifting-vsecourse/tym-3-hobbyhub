import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

const STATUSES = {
  pending: { variant: "pending", label: "Čeká na schválení" },
  approved: { variant: "success", label: "Schváleno" },
  rejected: { variant: "destructive", label: "Zamítnuto" },
  deadline: { variant: "signal", label: "Uzávěrka" },
  neutral: { variant: "secondary", label: "Plno" },
} as const

export type Status = keyof typeof STATUSES

type StatusBadgeProps = {
  status: Status
  /** Overrides the default wording, e.g. "Uzávěrka za 2 dny". */
  children?: ReactNode
  className?: string
}

/** Štítek — application state or a property of an event. */
export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const { variant, label } = STATUSES[status]

  return (
    <Badge
      variant={variant}
      className={className}
    >
      {children ?? label}
    </Badge>
  )
}
