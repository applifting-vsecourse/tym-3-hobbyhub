import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

const linkClass =
  "font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"

type Target =
  { kind: "user"; id: string } | { kind: "event"; id: string } | { kind: "group"; id: string }

/** A link to a record's detail in the administration. */
export function AdminLink({ to, children }: { to: Target; children: ReactNode }) {
  switch (to.kind) {
    case "user":
      return (
        <Link
          to="/admin/users/$userId"
          params={{ userId: to.id }}
          className={linkClass}
        >
          {children}
        </Link>
      )
    case "event":
      return (
        <Link
          to="/admin/events/$eventId"
          params={{ eventId: to.id }}
          className={linkClass}
        >
          {children}
        </Link>
      )
    case "group":
      return (
        <Link
          to="/admin/groups/$groupId"
          params={{ groupId: to.id }}
          className={linkClass}
        >
          {children}
        </Link>
      )
  }
}
