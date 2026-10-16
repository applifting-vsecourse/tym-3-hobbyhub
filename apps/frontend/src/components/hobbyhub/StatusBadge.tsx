import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

const STATUSES = {
  pending: "pending",
  approved: "success",
  rejected: "destructive",
  deadline: "signal",
  neutral: "secondary",
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
  const { t } = useTranslation()
  const variant = STATUSES[status]

  return (
    <Badge
      variant={variant}
      className={className}
    >
      {children ?? t(`hobbyhub.status.${status}`)}
    </Badge>
  )
}
