import { Link, type LinkProps, type RegisteredRouter } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

type BackLinkProps<TTo extends string | undefined> = {
  readonly to: TTo & LinkProps<"a", RegisteredRouter, string, TTo>["to"]
  readonly params?: LinkProps<"a", RegisteredRouter, string, TTo>["params"]
  /** Accessible name of the icon-only button, e.g. t("groups.back"). */
  readonly label: string
}

/** The round back button of the phone wireframes; desktop has the header nav. */
export function BackLink<const TTo extends string | undefined = undefined>({
  to,
  params,
  label,
}: BackLinkProps<TTo>) {
  // The props are checked against the route at the call site; Link itself cannot
  // follow the generic.
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="mb-4 rounded-full md:hidden"
    >
      <Link
        {...({ to, params } as unknown as LinkProps)}
        aria-label={label}
      >
        <ChevronLeft aria-hidden />
      </Link>
    </Button>
  )
}
