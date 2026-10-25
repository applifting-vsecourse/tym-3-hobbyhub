import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

type BackLinkProps = {
  readonly to: LinkProps["to"]
  /** Path params of `to`, e.g. the event of an event's subpage. */
  readonly params?: LinkProps["params"]
  /** Accessible name of the icon-only button, e.g. t("groups.back"). */
  readonly label: string
}

/** The round back button of the phone wireframes; desktop has the header nav. */
export function BackLink({ to, params, label }: BackLinkProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="mb-4 rounded-full md:hidden"
    >
      <Link
        to={to}
        params={params}
        aria-label={label}
      >
        <ChevronLeft aria-hidden />
      </Link>
    </Button>
  )
}
