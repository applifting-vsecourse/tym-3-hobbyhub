import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type BackLinkProps = {
  readonly to: LinkProps["to"]
}

/** The round back button of the phone wireframes; desktop has the header nav. */
export function BackLink({ to }: BackLinkProps) {
  const { t } = useTranslation()

  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="mb-4 rounded-full md:hidden"
    >
      <Link
        to={to}
        aria-label={t("groups.back")}
      >
        <ChevronLeft aria-hidden />
      </Link>
    </Button>
  )
}
